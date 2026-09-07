(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#estimate-schedule-dialog')) return;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const dialog = document.createElement('dialog'); dialog.id = 'estimate-schedule-dialog'; dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-estimate-schedule aria-label="Close">×</button><div class="dialog-kicker">ESTIMATE TO JOB</div><h2>Schedule accepted estimate</h2><p>Choose a live appointment slot and the customer service address before creating the dispatch job.</p><form><label>Service<input name="service" minlength="2" maxlength="120" required /></label><label>Available appointment<select name="slotId" required><option value="">Loading availability…</option></select></label><label>Service address<select name="locationId" required><option value="">Loading customer locations…</option></select></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-estimate-schedule>Cancel</button><button class="primary-btn" type="submit">Convert and schedule</button></div><p class="form-message" role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form'); const slotSelect = form.elements.slotId; const locationSelect = form.elements.locationId; const submit = form.querySelector('[type="submit"]'); const message = form.querySelector('.form-message'); let estimateId = ''; let slots = [];
  dialog.querySelectorAll('[data-close-estimate-schedule]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const open = async (button) => {
    estimateId = button.dataset.estimateId; form.reset(); message.textContent = ''; slotSelect.innerHTML = '<option value="">Loading availability…</option>'; locationSelect.innerHTML = '<option value="">Loading customer locations…</option>'; submit.disabled = true; dialog.showModal(); form.elements.service.focus();
    try {
      const [estimates, availability, profile] = await Promise.all([
        repository.list('estimates'),
        repository.getAvailability(new URLSearchParams(window.location.search).get('service') || 'default', 7, button.dataset.catalogItemId || ''),
        button.dataset.customerId ? repository.getCustomerProfile(button.dataset.customerId) : Promise.resolve(null)
      ]);
      const estimate = (Array.isArray(estimates) ? estimates : estimates.items || []).find((item) => item.id === estimateId); if (!estimate) throw new Error('estimate_not_found');
      form.elements.service.value = String(estimate.service || 'Service visit').slice(0, 120);
      slots = (availability.slotOptions || []).slice(0, 48); slotSelect.innerHTML = slots.length ? '<option value="">Choose an available slot</option>' + slots.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join('') : '<option value="">No appointments available</option>';
      const locations = profile ? [{ id: `${button.dataset.customerId}_primary`, label: 'Primary', address: profile.customer?.location || 'Address pending' }, ...(profile.locations || []).filter((item) => item.id !== `${button.dataset.customerId}_primary`)] : [];
      locationSelect.innerHTML = locations.length ? '<option value="">Choose a service address</option>' + locations.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label || 'Service address')} · ${escapeHtml(item.address || 'Address pending')}</option>`).join('') : '<option value="">No customer address available</option>';
      submit.disabled = !slots.length || !locations.length;
    } catch { slotSelect.innerHTML = '<option value="">Availability unavailable</option>'; locationSelect.innerHTML = '<option value="">Customer locations unavailable</option>'; message.textContent = 'Could not load the accepted estimate, available appointments, or service addresses.'; }
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const selected = slots.find((item) => item.id === slotSelect.value); if (!selected || !locationSelect.value) { message.textContent = 'Choose an available appointment and service address.'; return; }
    submit.disabled = true; message.textContent = 'Scheduling…';
    try { await repository.convertEstimate(estimateId, selected.label, crypto.randomUUID(), selected.id, locationSelect.value); dialog.close(); document.querySelector('[data-view="estimates"]')?.click(); }
    catch (error) { message.textContent = error?.message || 'Could not schedule this estimate. Confirm the slot is still available.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-estimate-action="schedule"]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); void open(button); }, true);
})();
