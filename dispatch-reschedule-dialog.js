(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#dispatch-reschedule-dialog')) return;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const dialog = document.createElement('dialog'); dialog.id = 'dispatch-reschedule-dialog'; dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-dispatch-reschedule aria-label="Close">×</button><div class="dialog-kicker">DISPATCH RECOVERY</div><h2>Reschedule job</h2><p>Choose a current available slot. The server will recheck technician conflicts and update the dispatch record atomically.</p><form><label>Service<input name="service" type="text" readonly /></label><label>Available appointment<select name="slotId" required><option value="">Loading availability…</option></select></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-dispatch-reschedule>Cancel</button><button class="primary-btn" type="submit">Save new time</button></div><p class="form-message" role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form'); const slotSelect = form.elements.slotId; const submit = form.querySelector('[type="submit"]'); const message = form.querySelector('.form-message'); let jobId = ''; let slots = [];
  dialog.querySelectorAll('[data-close-dispatch-reschedule]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const open = async (button) => {
    jobId = button.dataset.jobId; form.reset(); message.textContent = ''; slotSelect.innerHTML = '<option value="">Loading availability…</option>'; submit.disabled = true; dialog.showModal(); form.elements.service.focus();
    try {
      const jobs = await repository.list('dispatch'); const job = (Array.isArray(jobs) ? jobs : jobs.items || []).find((item) => item.id === jobId); if (!job) throw new Error('job_not_found');
      form.elements.service.value = String(job.service || 'Service visit');
      const availability = await repository.getAvailability(new URLSearchParams(window.location.search).get('service') || 'default', 14, job.catalogItemId || '');
      slots = (availability.slotOptions || []).slice(0, 48); slotSelect.innerHTML = slots.length ? '<option value="">Choose an available slot</option>' + slots.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join('') : '<option value="">No appointments available</option>'; submit.disabled = !slots.length;
    } catch { slotSelect.innerHTML = '<option value="">Availability unavailable</option>'; message.textContent = 'Could not load the job or current available appointments.'; }
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const selected = slots.find((item) => item.id === slotSelect.value); if (!selected) { message.textContent = 'Choose an available appointment slot.'; return; }
    submit.disabled = true; message.textContent = 'Rescheduling…';
    try { await repository.rescheduleJob(jobId, selected.id, crypto.randomUUID()); dialog.close(); document.querySelector('[data-view="dispatch"]')?.click(); }
    catch (error) { message.textContent = error?.message || 'Could not reschedule this job. The selected slot may no longer be available.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-job-action="reschedule"]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); void open(button); }, true);
})();
