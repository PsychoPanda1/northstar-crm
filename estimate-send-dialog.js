(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#estimate-send-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'estimate-send-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-estimate-send aria-label="Close">×</button><div class="dialog-kicker">ESTIMATE DELIVERY</div><h2>Send estimate</h2><p>Choose the customer-approved delivery channel. The estimate remains auditable and provider-pending until delivery confirms.</p><form><label>Delivery channel<select name="channel" required><option selected>SMS</option><option>Email</option></select></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-estimate-send>Cancel</button><button class="primary-btn" type="submit">Queue estimate</button></div><p class="form-message" data-estimate-send-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-estimate-send-message]');
  let estimateId = '';
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-estimate-send]').forEach((button) => button.addEventListener('click', close));
  const open = (id) => { estimateId = id; form.reset(); form.elements.channel.value = 'SMS'; message.textContent = ''; dialog.showModal(); form.elements.channel.focus(); };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message.textContent = 'Queueing estimate…';
    try {
      const result = await repository.sendEstimate(estimateId, form.elements.channel.value, crypto.randomUUID());
      message.textContent = result.duplicate ? 'This estimate delivery was already queued.' : 'Estimate queued for delivery.';
      setTimeout(() => { close(); document.querySelector('[data-view="estimates"]')?.click(); }, 350);
    } catch { message.textContent = 'Could not send the estimate. Check customer contact preferences and provider configuration.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-estimate-send]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    open(button.dataset.estimateSend);
  }, true);
})();
