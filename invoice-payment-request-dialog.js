(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#invoice-payment-request-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'invoice-payment-request-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-payment-request aria-label="Close">×</button><div class="dialog-kicker">RECEIVABLES</div><h2 id="payment-request-title">Request payment</h2><p id="payment-request-help">Send a secure payment request to the customer through their preferred channel.</p><form><label>Outstanding balance<input name="balance" type="text" readonly /></label><label>Delivery channel<select name="channel" required><option value="SMS">SMS</option><option value="Email">Email</option></select></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-payment-request>Cancel</button><button class="primary-btn" type="submit">Queue request</button></div><p class="form-message" data-payment-request-status role="status" aria-live="polite"></p></form>';
  dialog.setAttribute('aria-labelledby', 'payment-request-title');
  dialog.setAttribute('aria-describedby', 'payment-request-help');
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const status = dialog.querySelector('[data-payment-request-status]');
  const submit = form.querySelector('[type="submit"]');
  dialog.querySelectorAll('[data-close-payment-request]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const open = async (button) => {
    dialog.dataset.invoiceId = button.dataset.invoicePaymentRequest || '';
    form.reset(); status.textContent = 'Loading invoice balance…'; submit.disabled = true; dialog.showModal();
    try {
      const invoices = await repository.list('invoices', dialog.dataset.invoiceId);
      const invoice = invoices.find((item) => item.id === dialog.dataset.invoiceId);
      const balance = Number(invoice?.balance ?? Number(invoice?.amount || 0) - Number(invoice?.paidAmount || 0));
      if (!Number.isFinite(balance) || balance <= 0) throw new Error('no_balance');
      form.elements.balance.value = `$${balance.toFixed(2)} remaining`;
      form.elements.channel.value = invoice?.customerEmail && !invoice?.customerPhone ? 'Email' : 'SMS';
      status.textContent = 'The request will remain provider-pending until delivery is confirmed.';
      submit.disabled = false; form.elements.channel.focus();
    } catch { status.textContent = 'Could not load an unpaid invoice. Close and refresh the invoice list before trying again.'; }
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const channel = form.elements.channel.value;
    if (!dialog.dataset.invoiceId || !['SMS', 'Email'].includes(channel)) { status.textContent = 'Choose a valid delivery channel.'; return; }
    submit.disabled = true; status.textContent = 'Queueing payment request…';
    try {
      const result = await repository.requestInvoicePayment(dialog.dataset.invoiceId, channel);
      dialog.close(); showToast(result.duplicate ? 'That payment request is already queued.' : `Payment request queued by ${channel}.`); openRecords('messages');
    } catch (error) { status.textContent = error?.message === 'customer_channel_opted_out' ? 'The customer has opted out of that channel.' : 'Could not queue the payment request. Confirm the invoice and customer contact details.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-invoice-payment-request]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); void open(button); }, true);
})();
