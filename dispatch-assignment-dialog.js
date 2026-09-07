(() => {
  const repository = window.northstarRepository;
  const list = document.querySelector('#record-list');
  if (!repository || !list) return;
  let dialog;
  const eligibleRoles = new Set(['Lead technician', 'Field technician', 'Apprentice']);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const toast = (text) => { const node = document.querySelector('#toast'); if (!node) return; node.textContent = text; node.classList.add('show'); setTimeout(() => node.classList.remove('show'), 2800); };
  const selectedJobIds = () => [...list.querySelectorAll('[data-bulk-job]:checked')].map((input) => input.dataset.bulkJob).filter(Boolean);
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'dispatch-assignment-dialog';
    dialog.className = 'workflow-dialog';
    dialog.innerHTML = '<form method="dialog" class="workflow-dialog__form"><h2 id="dispatch-assignment-title">Assign technician</h2><p id="dispatch-assignment-help"></p><label>Field technician<select name="technician" required></select></label><p id="dispatch-assignment-error" role="alert" class="workflow-dialog__error"></p><div class="workflow-dialog__actions"><button value="cancel">Cancel</button><button id="dispatch-assignment-submit" value="default">Assign</button></div></form>';
    document.body.append(dialog);
    return dialog;
  };
  const open = async (mode, button) => {
    const jobIds = mode === 'bulk' ? selectedJobIds() : [button.dataset.jobId].filter(Boolean);
    if (!jobIds.length) return;
    const members = (await repository.list('team')).filter((member) => eligibleRoles.has(member.role));
    const modal = ensureDialog();
    const form = modal.querySelector('form');
    const select = form.elements.technician;
    const submit = modal.querySelector('#dispatch-assignment-submit');
    modal.querySelector('#dispatch-assignment-title').textContent = mode === 'bulk' ? `Assign ${jobIds.length} selected job${jobIds.length === 1 ? '' : 's'}` : 'Assign technician';
    modal.querySelector('#dispatch-assignment-help').textContent = 'Choose from the current field roster. The server will recheck skills, availability, and schedule conflicts before applying the assignment.';
    modal.querySelector('#dispatch-assignment-error').textContent = '';
    select.innerHTML = members.length ? members.map((member) => `<option value="${esc(member.name)}">${esc(member.name)}</option>`).join('') : '<option value="">No eligible technicians</option>';
    submit.disabled = !members.length;
    modal.showModal();
    select.focus();
    form.onsubmit = async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      submit.disabled = true;
      try {
        if (mode === 'bulk') await repository.bulkAssignJobs(jobIds, select.value);
        else await repository.updateJob(jobIds[0], 'assign', select.value);
        modal.close();
        toast(mode === 'bulk' ? `${jobIds.length} job${jobIds.length === 1 ? '' : 's'} assigned to ${select.value}.` : `Job assigned to ${select.value}.`);
        if (mode === 'bulk') document.querySelector('#drawer-refresh')?.click();
        else window.openRecords?.('dispatch');
      } catch (error) {
        modal.querySelector('#dispatch-assignment-error').textContent = error?.message === 'bulk assignment failed' || error?.message === 'assignment failed' ? 'Assignment was rejected. Check technician skills and schedule conflicts.' : 'Assignment is unavailable. Please try again.';
        submit.disabled = false;
      }
    };
  };
  document.addEventListener('click', (event) => {
    const bulk = event.target.closest('[data-dispatch-bulk-assign]');
    const single = event.target.closest('[data-job-action="assign"]');
    if (!bulk && !single) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void open(bulk ? 'bulk' : 'single', bulk || single);
  }, true);
})();
