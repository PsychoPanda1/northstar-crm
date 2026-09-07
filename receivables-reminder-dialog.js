(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#receivables-reminder-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'receivables-reminder-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-receivables aria-label="Close">×</button><div class="dialog-kicker">CASH COLLECTIONS</div><h2>Remind open balances</h2><p>Queue customer-safe payment reminders while honoring channel opt-outs and the existing 24-hour duplicate guard.</p><form><label>Reminder channel<select name="channel" required><option selected>Email</option><option>SMS</option></select></label><label>Minimum balance<input name="minBalance" type="number" min="0" max="1000000" step="0.01" value="0" required /></label><p class="form-hint">Only unpaid invoices at or above this balance will be considered.</p><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-receivables>Cancel</button><button class="primary-btn" type="submit">Queue reminders</button></div><p class="form-message" data-receivables-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-receivables-message]');
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-receivables]').forEach((button) => button.addEventListener('click', close));
  const open = () => { form.reset(); form.elements.channel.value = 'Email'; form.elements.minBalance.value = '0'; message.textContent = ''; dialog.showModal(); form.elements.channel.focus(); };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const minimum = Number(form.elements.minBalance.value);
    if (!Number.isFinite(minimum) || minimum < 0 || minimum > 1000000) { message.textContent = 'Enter a minimum balance between $0 and $1,000,000.'; return; }
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message.textContent = 'Queueing reminders…';
    try {
      const result = await repository.remindReceivables(minimum, form.elements.channel.value);
      message.textContent = `${result.queued || 0} reminder${result.queued === 1 ? '' : 's'} queued${result.duplicates ? ` · ${result.duplicates} already queued` : ''}.`;
      setTimeout(close, 500);
    } catch { message.textContent = 'Could not queue receivables reminders. Confirm owner or accountant access.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-receivables-reminders]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    open();
  }, true);
})();
