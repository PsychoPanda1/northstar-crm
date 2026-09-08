(() => {
  const repository = window.northstarRepository;
  const drawer = document.querySelector('#record-drawer');
  if (!repository?.runAutomations || !drawer || document.querySelector('#automation-run-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'automation-run-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-automation aria-label="Close">×</button><div class="dialog-kicker">CUSTOMER AUTOMATION</div><h2>Run follow-up automations</h2><p>Choose the channel and lookback windows for this run. Opt-outs, deduplication, and provider-pending delivery controls remain enforced.</p><form><label>Message channel<select name="channel"><option>SMS</option><option>Email</option></select></label><label>Upcoming appointment window<input name="lookaheadHours" type="number" min="1" max="168" step="1" value="24" /></label><label>Estimate age window<input name="estimateAgeDays" type="number" min="1" max="365" step="1" value="3" /></label><label>Open invoice age window<input name="invoiceAgeDays" type="number" min="1" max="365" step="1" value="7" /></label><label>Renewal window<input name="renewalDays" type="number" min="1" max="365" step="1" value="30" /></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-automation>Cancel</button><button class="primary-btn" type="submit">Run automations</button></div><p class="form-message" data-automation-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-automation-message]');
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-automation]').forEach((button) => button.addEventListener('click', close));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(['lookaheadHours', 'estimateAgeDays', 'invoiceAgeDays', 'renewalDays'].map((name) => [name, Number(form.elements[name].value)]));
    if (Object.values(values).some((value) => !Number.isInteger(value) || value < 1 || value > 365) || values.lookaheadHours > 168) { message.textContent = 'Use whole-number windows within the allowed limits.'; return; }
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message.textContent = 'Running approved automations…';
    try {
      const result = await repository.runAutomations({ channel: form.elements.channel.value, ...values });
      const total = Object.values(result).filter((item) => item && typeof item === 'object' && Number.isInteger(item.queued)).reduce((sum, item) => sum + item.queued, 0);
      close();
      if (typeof showToast === 'function') showToast(`${total} automated follow-up${total === 1 ? '' : 's'} queued.`);
    } catch { message.textContent = 'Could not run customer automations. Check your session and try again.'; }
    finally { submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-run-automations]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation(); dialog.showModal(); form.elements.channel.focus();
  }, true);
})();
