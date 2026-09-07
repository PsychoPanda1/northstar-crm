(function () {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#request-convert-dialog')) return;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const dialog = document.createElement('dialog');
  dialog.id = 'request-convert-dialog'; dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-request-convert aria-label="Close">×</button><div class="dialog-kicker">REQUEST TO JOB</div><h2>Schedule customer request</h2><p data-request-convert-help>Choose a service and an available appointment slot.</p><form><label>Service<input name="service" minlength="2" maxlength="100" required /></label><label>Available appointment<select name="slotId" required><option value="">Loading availability…</option></select></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-request-convert>Cancel</button><button class="primary-btn" type="submit">Schedule job</button></div><p class="form-message" role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form'); const slot = form.elements.slotId; const submit = form.querySelector('[type="submit"]'); const message = form.querySelector('.form-message'); let requestId = ''; let slots = [];
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-request-convert]').forEach((button) => button.addEventListener('click', close));
  const open = async (id) => {
    requestId = id; message.textContent = ''; form.reset(); slot.innerHTML = '<option value="">Loading availability…</option>'; submit.disabled = true; dialog.showModal(); form.elements.service.focus();
    try {
      const [requests, availability] = await Promise.all([repository.list('requests'), repository.getAvailability('', 14)]);
      const request = requests.find((item) => item.id === id); if (!request) throw new Error('request_not_found');
      form.elements.service.value = String(request.service || request.type || 'Service visit').slice(0, 100);
      slots = (availability.slotOptions || []).slice(0, 48); slot.innerHTML = slots.length ? '<option value="">Choose an available slot</option>' + slots.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join('') : '<option value="">No appointments available</option>';
      submit.disabled = !slots.length;
    } catch { slot.innerHTML = '<option value="">Availability unavailable</option>'; message.textContent = 'Could not load the customer request or available appointments.'; }
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const selected = slots.find((item) => item.id === slot.value); if (!selected) { message.textContent = 'Choose an available appointment slot.'; return; }
    submit.disabled = true; message.textContent = 'Scheduling…';
    try { await repository.convertRequest(requestId, selected.label, form.elements.service.value.trim(), { slotId: selected.id, startsAt: selected.startsAt, endsAt: selected.endsAt }, crypto.randomUUID()); close(); document.querySelector('[data-view="dispatch"]')?.click(); } catch (error) { message.textContent = error?.message || 'Could not schedule this request.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-request-action="convert"]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); void open(button.dataset.requestId); }, true);
}());
