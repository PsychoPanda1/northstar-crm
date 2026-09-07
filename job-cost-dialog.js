(function () {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#job-cost-dialog')) return;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const dialog = document.createElement('dialog'); dialog.id = 'job-cost-dialog'; dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-job-cost aria-label="Close">×</button><div class="dialog-kicker">JOB COSTING</div><h2 data-job-cost-title>Record cost</h2><p data-job-cost-help>Capture a labor or material cost against this work order.</p><form><label data-job-cost-technician>Technician<input name="technician" maxlength="100" required /></label><label data-job-cost-hours>Labor hours<input name="hours" type="number" min="0.25" max="24" step="0.25" required /></label><label data-job-cost-rate>Hourly cost rate<input name="hourlyRate" type="number" min="0" max="10000" step="0.01" required /></label><label data-job-cost-material>Material<select name="materialId" required><option value="">Loading materials…</option></select></label><label data-job-cost-quantity>Quantity<input name="quantity" type="number" min="1" max="10000" step="1" required /></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-job-cost>Cancel</button><button class="primary-btn" type="submit">Save cost</button></div><p class="form-message" role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form'); const title = dialog.querySelector('[data-job-cost-title]'); const help = dialog.querySelector('[data-job-cost-help]'); const submit = form.querySelector('[type="submit"]'); const message = form.querySelector('.form-message'); let mode = ''; let jobId = '';
  const close = () => { if (dialog.open) dialog.close(); };
  const toggle = (selector, visible) => { const label = dialog.querySelector(selector); label.hidden = !visible; label.querySelectorAll('input, select').forEach((input) => { input.disabled = !visible; input.required = visible; }); };
  dialog.querySelectorAll('[data-close-job-cost]').forEach((button) => button.addEventListener('click', close));
  const open = async (nextMode, id) => {
    mode = nextMode; jobId = id; form.reset(); message.textContent = ''; submit.disabled = true; title.textContent = mode === 'labor' ? 'Log labor cost' : 'Consume material'; help.textContent = mode === 'labor' ? 'Record the technician time and internal hourly cost for this work order.' : 'Choose a stocked material and record the quantity used on this work order.';
    toggle('[data-job-cost-technician]', mode === 'labor'); toggle('[data-job-cost-hours]', mode === 'labor'); toggle('[data-job-cost-rate]', mode === 'labor'); toggle('[data-job-cost-material]', mode === 'material'); toggle('[data-job-cost-quantity]', mode === 'material');
    dialog.showModal();
    try {
      const detail = await repository.getJobDetail(jobId);
      if (mode === 'labor') { form.elements.technician.value = detail.job.technician || ''; form.elements.hours.value = '1'; form.elements.hourlyRate.value = '0'; }
      else { const materials = await repository.list('materials'); const available = materials.filter((item) => Number(item.onHand ?? 0) > 0); const select = form.elements.materialId; select.innerHTML = available.length ? '<option value="">Choose material</option>' + available.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} · ${escapeHtml(item.onHand)} ${escapeHtml(item.unit || 'units')}</option>`).join('') : '<option value="">No stocked materials</option>'; form.elements.quantity.value = '1'; submit.disabled = !available.length; }
      if (mode === 'labor') submit.disabled = false;
    } catch { message.textContent = 'Could not load the work order or inventory.'; }
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); submit.disabled = true; message.textContent = 'Saving…';
    try {
      if (mode === 'labor') { const technician = form.elements.technician.value.trim(); const hours = Number(form.elements.hours.value); const hourlyRate = Number(form.elements.hourlyRate.value); if (technician.length < 2 || !Number.isFinite(hours) || hours <= 0 || !Number.isFinite(hourlyRate) || hourlyRate < 0) throw new Error('Enter valid labor details.'); await repository.logLabor(jobId, technician, hours, hourlyRate, crypto.randomUUID()); }
      else { const quantity = Number(form.elements.quantity.value); if (!form.elements.materialId.value || !Number.isInteger(quantity) || quantity <= 0) throw new Error('Choose a material and positive quantity.'); await repository.consumeMaterial(jobId, form.elements.materialId.value, quantity, crypto.randomUUID()); }
      close(); document.querySelector(`[data-job-detail="${CSS.escape(jobId)}"]`)?.click();
    } catch (error) { message.textContent = error?.message || 'Could not record the job cost.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-job-cost-action="labor"],[data-job-cost-action="material"]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); void open(button.dataset.jobCostAction, button.dataset.jobId); }, true);
}());
