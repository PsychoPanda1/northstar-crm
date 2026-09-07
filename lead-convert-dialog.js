(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#lead-convert-dialog')) return;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const dialog = document.createElement('dialog');
  dialog.id = 'lead-convert-dialog'; dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-lead-convert aria-label="Close">×</button><div class="dialog-kicker">LEAD TO JOB</div><h2>Schedule qualified lead</h2><p>Choose an available appointment slot to create the job and preserve the lead attribution in the service workflow.</p><form><label>Requested service<input name="service" minlength="2" maxlength="120" required /></label><label>Available appointment<select name="slotId" required><option value="">Loading availability…</option></select></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-lead-convert>Cancel</button><button class="primary-btn" type="submit">Convert and schedule</button></div><p class="form-message" role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form'); const slotSelect = form.elements.slotId; const submit = form.querySelector('[type="submit"]'); const message = form.querySelector('.form-message');
  let leadId = ''; let slots = [];
  dialog.querySelectorAll('[data-close-lead-convert]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const open = async (id) => {
    leadId = id; form.reset(); message.textContent = ''; slotSelect.innerHTML = '<option value="">Loading availability…</option>'; submit.disabled = true; dialog.showModal(); form.elements.service.focus();
    try {
      const [leads, availability] = await Promise.all([repository.list('leads'), repository.getAvailability(new URLSearchParams(window.location.search).get('service') || 'default', 7)]);
      const lead = (Array.isArray(leads) ? leads : leads.items || []).find((item) => item.id === id); if (!lead) throw new Error('lead_not_found');
      form.elements.service.value = String(lead.service || 'Service visit').slice(0, 120);
      slots = (availability.slotOptions || []).slice(0, 48);
      slotSelect.innerHTML = slots.length ? '<option value="">Choose an available slot</option>' + slots.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join('') : '<option value="">No appointments available</option>';
      submit.disabled = !slots.length;
    } catch { slotSelect.innerHTML = '<option value="">Availability unavailable</option>'; message.textContent = 'Could not load this lead or available appointments.'; }
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const selected = slots.find((item) => item.id === slotSelect.value);
    if (!selected) { message.textContent = 'Choose an available appointment slot.'; return; }
    submit.disabled = true; message.textContent = 'Scheduling…';
    try { await repository.convertLead(leadId, selected.label, crypto.randomUUID(), selected.id); dialog.close(); document.querySelector('[data-view="leads"]')?.click(); }
    catch (error) { message.textContent = error?.message || 'Could not convert this lead. Confirm the slot is still available.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-lead-action="convert"]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); void open(button.dataset.leadId); }, true);
})();
