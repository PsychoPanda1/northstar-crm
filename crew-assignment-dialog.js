(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#crew-assignment-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'crew-assignment-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-crew-assignment aria-label="Close">×</button><div class="dialog-kicker">DISPATCH CREW</div><h2 id="crew-assignment-title">Assign job crew</h2><p id="crew-assignment-help">Select the field technicians who will work this job. Server-side skill and schedule checks remain authoritative.</p><form><fieldset><legend>Available field staff</legend><div data-crew-options>Loading team…</div></fieldset><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-crew-assignment>Cancel</button><button class="primary-btn" type="submit">Assign crew</button></div><p class="form-message" data-crew-assignment-status role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  dialog.setAttribute('aria-labelledby', 'crew-assignment-title');
  dialog.setAttribute('aria-describedby', 'crew-assignment-help');
  const form = dialog.querySelector('form');
  const options = dialog.querySelector('[data-crew-options]');
  const status = dialog.querySelector('[data-crew-assignment-status]');
  const submit = form.querySelector('[type="submit"]');
  let jobId = '';
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  dialog.querySelectorAll('[data-close-crew-assignment]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const open = async (button) => {
    jobId = button.dataset.crewAssign || ''; form.reset(); submit.disabled = true; status.textContent = 'Loading team…'; options.textContent = 'Loading team…'; dialog.showModal();
    try {
      const team = await repository.list('team');
      const eligible = team.filter((member) => ['Lead technician', 'Field technician', 'Apprentice'].includes(member.role));
      options.innerHTML = eligible.length ? eligible.map((member) => `<label class="checkbox-field"><input type="checkbox" name="crew" value="${esc(member.name)}" /> ${esc(member.name)} · ${esc(member.role)}</label>`).join('') : '<p>No eligible field staff are configured.</p>';
      status.textContent = eligible.length ? 'Choose one or more crew members.' : 'Add an eligible field technician before assigning a crew.'; submit.disabled = !eligible.length;
      options.querySelector('input')?.focus();
    } catch { options.textContent = 'Team unavailable.'; status.textContent = 'Could not load the field team.'; }
  };
  form.addEventListener('submit', async (event) => { event.preventDefault(); const names = [...form.querySelectorAll('input[name="crew"]:checked')].map((input) => input.value); if (!jobId || !names.length) { status.textContent = 'Select at least one crew member.'; return; } submit.disabled = true; status.textContent = 'Assigning crew…'; try { await repository.assignJobCrew(jobId, names); dialog.close(); showToast(`Crew assigned: ${names.join(', ')}.`); openRecords('dispatch'); } catch { status.textContent = 'Could not assign crew. Check technician skills and schedule conflicts.'; submit.disabled = false; } });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-crew-assign]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); void open(button); }, true);
})();
