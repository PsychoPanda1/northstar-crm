(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#estimate-reminder-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'estimate-reminder-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-estimate-reminders aria-label="Close">×</button><div class="dialog-kicker">PIPELINE FOLLOW-UP</div><h2>Remind open estimates</h2><p>Re-engage aging estimates with a controlled follow-up window and customer-safe channel selection.</p><form><label>Older than (days)<input name="days" type="number" min="1" max="365" step="1" value="30" required /></label><label>Follow-up channel<select name="channel" required><option selected>SMS</option><option>Email</option></select></label><p class="form-hint">Only open estimates older than this window will be considered.</p><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-estimate-reminders>Cancel</button><button class="primary-btn" type="submit">Queue follow-ups</button></div><p class="form-message" data-estimate-reminder-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-estimate-reminder-message]');
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-estimate-reminders]').forEach((button) => button.addEventListener('click', close));
  const open = () => { form.reset(); form.elements.days.value = '30'; form.elements.channel.value = 'SMS'; message.textContent = ''; dialog.showModal(); form.elements.days.focus(); };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const days = Number(form.elements.days.value);
    if (!Number.isInteger(days) || days < 1 || days > 365) { message.textContent = 'Enter a whole-number age window from 1 to 365 days.'; return; }
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message.textContent = 'Queueing estimate follow-ups…';
    try {
      const result = await repository.remindOpenEstimates(days, form.elements.channel.value);
      message.textContent = `${result.queued || 0} follow-up${result.queued === 1 ? '' : 's'} queued${result.duplicates ? ` · ${result.duplicates} already queued` : ''}.`;
      setTimeout(close, 500);
    } catch { message.textContent = 'Could not queue estimate follow-ups. Confirm owner or dispatcher access.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('#estimate-reminders');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    open();
  }, true);
})();
