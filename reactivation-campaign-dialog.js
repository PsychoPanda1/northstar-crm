(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#reactivation-campaign-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'reactivation-campaign-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-reactivation aria-label="Close">×</button><div class="dialog-kicker">CUSTOMER RETENTION</div><h2>Win back customers</h2><p>Reach customers who have gone quiet while keeping the campaign window, channel, and audience explicit.</p><form><label>Inactive for at least (days)<input name="days" type="number" min="30" max="730" step="1" value="180" required /></label><label>Campaign channel<select name="channel" required><option selected>SMS</option><option>Email</option></select></label><label>Customer tag <span>(optional)</span><input name="tag" type="text" maxlength="80" placeholder="maintenance, VIP, annual-plan" /></label><p class="form-hint">Only customers inactive for this window are considered. Existing queued messages remain protected from duplicates.</p><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-reactivation>Cancel</button><button class="primary-btn" type="submit">Queue campaign</button></div><p class="form-message" data-reactivation-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-reactivation-message]');
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-reactivation]').forEach((button) => button.addEventListener('click', close));
  const open = () => { form.reset(); form.elements.days.value = '180'; form.elements.channel.value = 'SMS'; message.textContent = ''; dialog.showModal(); form.elements.days.focus(); };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const days = Number(form.elements.days.value);
    if (!Number.isInteger(days) || days < 30 || days > 730) { message.textContent = 'Enter a whole-number inactivity window from 30 to 730 days.'; return; }
    const tag = form.elements.tag.value.trim().toLowerCase();
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message.textContent = 'Queueing reactivation campaign…';
    try {
      const result = await repository.queueReactivation(days, form.elements.channel.value, tag);
      message.textContent = `${result.queued || 0} message${result.queued === 1 ? '' : 's'} queued${result.duplicates ? ` · ${result.duplicates} already queued` : ''}.`;
      setTimeout(close, 500);
    } catch { message.textContent = 'Could not queue the reactivation campaign. Confirm owner or dispatcher access.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('#reactivation-campaign');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    open();
  }, true);
})();
