(() => {
  const list = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!list || !repository?.assignJobCrew) return;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const dialog = document.createElement('dialog');
  dialog.className = 'workflow-dialog';
  dialog.id = 'crew-assignment-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-crew-dialog aria-label="Close">×</button><div class="dialog-kicker">DISPATCH COORDINATION</div><h2>Assign field crew</h2><p>Select every technician who will work this job. Skill and schedule conflicts are checked before the crew changes.</p><form><fieldset style="border:0;padding:0;margin:0"><legend class="sr-only">Eligible technicians</legend><div data-crew-options></div></fieldset><p class="form-message" role="status" aria-live="polite"></p><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-crew-dialog>Cancel</button><button class="primary-btn" type="submit">Assign crew</button></div></form>';
  document.body.append(dialog);
  dialog.querySelectorAll('[data-close-crew-dialog]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const notify = (message) => { const toast = document.querySelector('#toast'); if (!toast) return; toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); };
  const eligibleMembers = async () => (await repository.list('team')).filter((member) => ['Lead technician', 'Field technician', 'Apprentice'].includes(member.role));
  const openFor = async (button) => {
    const options = dialog.querySelector('[data-crew-options]');
    const message = dialog.querySelector('.form-message');
    const submit = dialog.querySelector('[type="submit"]');
    message.textContent = 'Loading eligible technicians…';
    submit.disabled = true;
    try {
      const members = await eligibleMembers();
      if (!members.length) { message.textContent = 'No eligible field technicians are configured.'; return; }
      const currentText = button.closest('[data-dispatch-job]')?.querySelector('.dispatch-job-meta small')?.textContent || '';
      const currentNames = currentText.startsWith('Crew: ') ? currentText.slice(6).split(',').map((name) => name.trim()) : [];
      options.innerHTML = members.map((member) => `<label style="display:flex;align-items:center;gap:10px;padding:8px 0"><input type="checkbox" name="technician" value="${escapeHtml(member.name)}" ${currentNames.includes(member.name) ? 'checked' : ''} /><span><strong>${escapeHtml(member.name)}</strong><small style="display:block;color:var(--muted)">${escapeHtml(member.role)}${member.skills?.length ? ` · ${escapeHtml(member.skills.join(', '))}` : ''}</small></span></label>`).join('');
      message.textContent = '';
      dialog.showModal();
      const form = dialog.querySelector('form');
      form.onsubmit = async (event) => {
        event.preventDefault();
        const technicians = [...form.querySelectorAll('input[name="technician"]:checked')].map((input) => input.value);
        if (!technicians.length) { message.textContent = 'Select at least one technician.'; return; }
        submit.disabled = true;
        message.textContent = 'Checking skills and schedule…';
        try {
          await repository.assignJobCrew(button.dataset.crewAssign, technicians, crypto.randomUUID());
          dialog.close();
          notify(`Crew assigned: ${technicians.join(', ')}.`);
          document.querySelector('#drawer-refresh')?.click();
        } catch { message.textContent = 'Crew could not be assigned. Check technician skills and schedule conflicts.'; submit.disabled = false; }
      };
    } catch { message.textContent = 'Technician roster is unavailable.'; }
    finally { submit.disabled = false; }
  };
  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-crew-assign]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    button.disabled = true;
    void openFor(button).finally(() => { button.disabled = false; });
  }, true);
})();
