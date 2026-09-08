(() => {
  const repository = window.northstarRepository;
  const list = document.querySelector('#record-list');
  if (!repository || !list || document.querySelector('#dispatch-bulk-dialog')) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'workflow-dialog';
  dialog.id = 'dispatch-bulk-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-dispatch-bulk aria-label="Close">×</button><div class="dialog-kicker">DISPATCH CONTROL</div><h2>Update selected jobs</h2><p data-dispatch-bulk-summary></p><form><label data-dispatch-bulk-technician>Technician<select name="technician" required><option value="">Loading field roster…</option></select></label><label data-dispatch-bulk-status hidden>New status<select name="status"><option>Confirmed</option><option>En route</option><option>In progress</option><option>Canceled</option></select></label><label data-dispatch-bulk-note hidden>Cancellation note <span>(optional)</span><textarea name="note" rows="3" maxlength="500" placeholder="Why is this work being canceled?"></textarea></label><div data-dispatch-bulk-slots hidden></div><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-dispatch-bulk>Cancel</button><button class="primary-btn" type="submit">Apply update</button></div><p class="form-message" data-dispatch-bulk-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);

  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-dispatch-bulk-message]');
  const summary = dialog.querySelector('[data-dispatch-bulk-summary]');
  const technicianField = dialog.querySelector('[data-dispatch-bulk-technician]');
  const statusField = dialog.querySelector('[data-dispatch-bulk-status]');
  const noteField = dialog.querySelector('[data-dispatch-bulk-note]');
  const slotsField = dialog.querySelector('[data-dispatch-bulk-slots]');
  let mode = 'assign';

  const selection = () => [...list.querySelectorAll('[data-bulk-job]:checked')].map((input) => input.dataset.bulkJob).filter(Boolean);
  const toast = (text) => { const target = document.querySelector('#toast'); if (!target) return; target.textContent = text; target.classList.add('show'); setTimeout(() => target.classList.remove('show'), 2800); };
  const setMode = (nextMode, count) => {
    mode = nextMode;
    technicianField.hidden = mode !== 'assign';
    technicianField.querySelector('select').required = mode === 'assign';
    statusField.hidden = mode !== 'status';
    statusField.querySelector('select').required = mode === 'status';
    noteField.hidden = mode !== 'status';
    slotsField.hidden = mode !== 'reschedule';
    summary.textContent = `${count} selected job${count === 1 ? '' : 's'} will be updated.`;
    message.textContent = '';
    dialog.querySelector('h2').textContent = mode === 'assign' ? 'Assign selected jobs' : mode === 'status' ? 'Update selected job status' : 'Reschedule selected jobs';
  };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const loadSlots = async (ids) => { const jobs = (await repository.list('dispatch')).filter((job) => ids.includes(job.id)); const grouped = new Map(); for (const job of jobs) { const availability = await repository.getAvailability(new URLSearchParams(window.location.search).get('service') || 'default', 14, job.catalogItemId || ''); const slots = (availability.slotOptions || []).slice(0, 24); grouped.set(job.id, slots); } slotsField.innerHTML = jobs.map((job) => { const slots = grouped.get(job.id) || []; return `<label>${escapeHtml(job.service || job.id)} · ${escapeHtml(job.customer || 'Customer')}<select name="slot-${escapeHtml(job.id)}" data-bulk-slot-job="${escapeHtml(job.id)}" required><option value="">Choose an available time</option>${slots.map((slot) => `<option value="${escapeHtml(slot.id)}">${escapeHtml(slot.label)}</option>`).join('')}</select></label>`; }).join(''); if (!jobs.length || [...slotsField.querySelectorAll('select')].some((select) => select.options.length < 2)) throw new Error('no_slots'); };
  const loadTechnicians = async () => {
    const select = technicianField.querySelector('select');
    const members = (await repository.list('team')).filter((member) => ['Lead technician', 'Field technician', 'Apprentice'].includes(member.role));
    select.innerHTML = members.length ? `<option value="">Choose a technician</option>${members.map((member) => `<option value="${String(member.name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}">${String(member.name || '').replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]) )}</option>`).join('')}` : '<option value="">No eligible technicians</option>';
  };
  const open = async (nextMode) => {
    const ids = selection();
    if (!ids.length) { toast('Select at least one job first.'); return; }
    setMode(nextMode, ids.length);
    if (nextMode === 'assign') { try { await loadTechnicians(); } catch { message.textContent = 'Could not load the field roster.'; } }
    if (nextMode === 'reschedule') { try { await loadSlots(ids); } catch { message.textContent = 'Could not load an available slot for every selected job.'; } }
    dialog.showModal();
    (nextMode === 'assign' ? technicianField.querySelector('select') : statusField.querySelector('select')).focus();
  };
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-dispatch-bulk]').forEach((button) => button.addEventListener('click', close));
  statusField.querySelector('select').addEventListener('change', () => { noteField.hidden = statusField.querySelector('select').value !== 'Canceled'; });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const ids = selection();
    if (!ids.length || !form.reportValidity()) return;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    message.textContent = mode === 'assign' ? 'Checking technician skills and schedule conflicts…' : 'Updating job lifecycle…';
    try {
      if (mode === 'assign') {
        const result = await repository.bulkAssignJobs(ids, form.elements.technician.value);
        toast(result.duplicate ? 'That bulk assignment was already applied.' : `${result.jobs?.length || ids.length} job${ids.length === 1 ? '' : 's'} assigned.`);
      } else if (mode === 'status') {
        const status = form.elements.status.value;
        const result = await repository.bulkUpdateJobStatus(ids, status, form.elements.note.value.trim());
        toast(`${result.jobs?.length || ids.length} job${ids.length === 1 ? '' : 's'} marked ${status}.`);
      } else {
        const changes = ids.map((jobId) => ({ jobId, slotId: form.elements[`slot-${jobId}`]?.value || '' }));
        const result = await repository.bulkRescheduleJobs(changes);
        toast(result.duplicate ? 'That bulk reschedule was already applied.' : `${result.jobs?.length || ids.length} job${ids.length === 1 ? '' : 's'} rescheduled.`);
      }
      close();
      document.querySelector('#drawer-refresh')?.click();
    } catch (error) {
      message.textContent = mode === 'assign' ? (error?.message === 'bulk assignment failed' ? 'Assignment rejected. Check technician skills and schedule conflicts.' : 'Bulk assignment is unavailable.') : mode === 'status' ? 'Status update failed. Check lifecycle transitions and technician assignments.' : 'Reschedule rejected. Check availability and technician conflicts.';
      submit.disabled = false;
    }
  });
  document.addEventListener('click', (event) => {
    const assign = event.target.closest('[data-dispatch-bulk-assign], [data-bulk-assign]');
    const status = event.target.closest('[data-bulk-status]');
    const reschedule = event.target.closest('[data-bulk-reschedule]');
    if (!assign && !status && !reschedule) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void open(status ? 'status' : reschedule ? 'reschedule' : 'assign');
  }, true);
})();
