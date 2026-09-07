(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#plan-reminder-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'plan-reminder-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-plan-reminders aria-label="Close">×</button><div class="dialog-kicker">SERVICE AGREEMENTS</div><h2>Remind upcoming renewals</h2><p>Queue renewal reminders for active plans while honoring customer channel preferences and duplicate protection.</p><form><label>Renewing within (days)<input name="days" type="number" min="1" max="90" step="1" value="30" required /></label><label>Reminder channel<select name="channel" required><option selected>SMS</option><option>Email</option></select></label><p class="form-hint">Choose a window from 1 to 90 days so the team can coordinate renewal conversations.</p><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-plan-reminders>Cancel</button><button class="primary-btn" type="submit">Queue reminders</button></div><p class="form-message" data-plan-reminder-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-plan-reminder-message]');
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-plan-reminders]').forEach((button) => button.addEventListener('click', close));
  const open = () => { form.reset(); form.elements.days.value = '30'; form.elements.channel.value = 'SMS'; message.textContent = ''; dialog.showModal(); form.elements.days.focus(); };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const days = Number(form.elements.days.value);
    if (!Number.isInteger(days) || days < 1 || days > 90) { message.textContent = 'Enter a whole-number renewal window from 1 to 90 days.'; return; }
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message.textContent = 'Queueing renewal reminders…';
    try {
      const result = await repository.remindPlans(days, form.elements.channel.value);
      message.textContent = `${result.queued || 0} reminder${result.queued === 1 ? '' : 's'} queued${result.duplicates ? ` · ${result.duplicates} already queued` : ''}.`;
      setTimeout(close, 500);
    } catch { message.textContent = 'Could not queue renewal reminders. Confirm owner or dispatcher access.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('#plan-reminders');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    open();
  }, true);
})();
