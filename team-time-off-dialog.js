(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#team-time-off-dialog')) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'team-time-off-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-time-off aria-label="Close">×</button><div class="dialog-kicker">TEAM AVAILABILITY</div><h2 data-time-off-title>Block technician time</h2><p data-time-off-help>Keep dispatch recommendations accurate by recording planned unavailability.</p><form><label>Technician<select name="technician" required><option value="">Loading technicians…</option></select></label><div data-time-off-add><label>Start<input name="startsAt" type="datetime-local" required /></label><label>End<input name="endsAt" type="datetime-local" required /></label><label>Reason<input name="reason" type="text" maxlength="120" value="Unavailable" required /></label></div><div data-time-off-manage hidden><label>Active time-off block<select name="block"><option value="">Loading blocks…</option></select></label><label>Cancellation note<input name="note" type="text" maxlength="160" value="Availability changed." /></label></div><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-time-off>Cancel</button><button class="primary-btn" type="submit" data-time-off-submit>Save time off</button></div><p class="form-message" data-time-off-message role="status" aria-live="polite"></p></form></dialog>';
  document.body.append(dialog);

  const form = dialog.querySelector('form');
  const technicianInput = form.elements.technician;
  const startsInput = form.elements.startsAt;
  const endsInput = form.elements.endsAt;
  const reasonInput = form.elements.reason;
  const blockInput = form.elements.block;
  const noteInput = form.elements.note;
  const addPanel = dialog.querySelector('[data-time-off-add]');
  const managePanel = dialog.querySelector('[data-time-off-manage]');
  const title = dialog.querySelector('[data-time-off-title]');
  const help = dialog.querySelector('[data-time-off-help]');
  const message = dialog.querySelector('[data-time-off-message]');
  const submit = dialog.querySelector('[data-time-off-submit]');
  let mode = 'add';
  let activeBlocks = [];

  const eligible = (items) => (items || []).filter((item) => ['Lead technician', 'Field technician', 'Apprentice'].includes(item.role));
  const close = () => { if (dialog.open) dialog.close(); };
  const localDateTime = (date) => { const value = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return value.toISOString().slice(0, 16); };
  const renderBlocks = () => {
    blockInput.innerHTML = activeBlocks.length ? activeBlocks.map((item) => `<option value="${String(item.id).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">${new Date(item.startsAt).toLocaleString()} – ${new Date(item.endsAt).toLocaleString()} · ${String(item.reason || 'Unavailable').replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]))}</option>`).join('') : '<option value="">No active time-off blocks</option>';
  };
  const loadBlocks = async () => {
    const member = technicianInput.value;
    if (mode !== 'manage' || !member) return;
    const selected = (await repository.list('team')).find((item) => item.name === member);
    if (!selected) return;
    const result = await repository.listTeamTimeOff(selected.id);
    activeBlocks = (result.items || []).filter((item) => item.status !== 'Canceled' && Date.parse(item.endsAt) > Date.now());
    renderBlocks();
    message.textContent = activeBlocks.length ? '' : 'This technician has no active time-off blocks.';
  };
  const open = async (nextMode) => {
    mode = nextMode;
    form.reset();
    title.textContent = mode === 'manage' ? 'Manage technician time off' : 'Block technician time';
    help.textContent = mode === 'manage' ? 'Cancel an active block when availability changes.' : 'Keep dispatch recommendations accurate by recording planned unavailability.';
    addPanel.hidden = mode === 'manage';
    managePanel.hidden = mode !== 'manage';
    submit.textContent = mode === 'manage' ? 'Cancel time off' : 'Save time off';
    if (mode === 'add') { const start = new Date(); start.setMinutes(0, 0, 0); startsInput.value = localDateTime(start); const end = new Date(start.getTime() + 60 * 60 * 1000); endsInput.value = localDateTime(end); reasonInput.value = 'Unavailable'; }
    message.textContent = 'Loading technicians…';
    try {
      const members = eligible(await repository.list('team'));
      technicianInput.innerHTML = members.length ? `<option value="">Choose a technician</option>${members.map((item) => `<option value="${String(item.name).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">${String(item.name).replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]))} · ${String(item.role || 'Field technician').replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]))}</option>`).join('')}` : '<option value="">No eligible technicians</option>';
      message.textContent = members.length ? '' : 'Add an eligible field technician before managing availability.';
      dialog.showModal();
      if (members.length) technicianInput.focus();
    } catch { message.textContent = 'Could not load the technician roster.'; dialog.showModal(); }
  };

  dialog.querySelectorAll('[data-close-time-off]').forEach((button) => button.addEventListener('click', close));
  technicianInput.addEventListener('change', () => { void loadBlocks().catch(() => { message.textContent = 'Could not load time-off blocks.'; }); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const members = eligible(await repository.list('team'));
    const member = members.find((item) => item.name === technicianInput.value);
    if (!member) { message.textContent = 'Choose a technician from the roster.'; return; }
    submit.disabled = true;
    try {
      if (mode === 'manage') {
        if (!blockInput.value) { message.textContent = 'Choose an active time-off block.'; return; }
        await repository.cancelTeamTimeOff(member.id, blockInput.value, noteInput.value.trim() || 'Availability changed.');
        message.textContent = 'Time-off block canceled.';
      } else {
        const startsAt = new Date(startsInput.value);
        const endsAt = new Date(endsInput.value);
        const reason = reasonInput.value.trim();
        if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || startsAt >= endsAt || reason.length < 2) { message.textContent = 'Choose a valid time range and reason.'; return; }
        await repository.createTeamTimeOff(member.id, startsAt.toISOString(), endsAt.toISOString(), reason);
        message.textContent = `Time off saved for ${member.name}.`;
      }
      setTimeout(close, 500);
    } catch { message.textContent = mode === 'manage' ? 'Could not cancel that time-off block.' : 'Could not save time off. Check the time range.'; }
    finally { submit.disabled = false; }
  });

  document.addEventListener('click', (event) => {
    const add = event.target.closest('#add-team-time-off');
    const manage = event.target.closest('#manage-team-time-off');
    if (!add && !manage) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void open(add ? 'add' : 'manage');
  }, true);
})();
