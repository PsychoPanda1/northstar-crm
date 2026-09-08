(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#invoice-payment-schedule-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'invoice-payment-schedule-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-payment-schedule aria-label="Close">×</button><div class="dialog-kicker">RECEIVABLES</div><h2 id="payment-schedule-title">Create payment plan</h2><p id="payment-schedule-help">Set the booking deposit and completion balance for this invoice.</p><form><label>Invoice total<input name="total" type="number" min="0.01" step="0.01" required value="1000" /></label><label>Booking deposit<input name="deposit" type="number" min="0.01" step="0.01" required value="400" /></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-payment-schedule>Cancel</button><button class="primary-btn" type="submit">Create payment plan</button></div><p class="form-message" data-payment-schedule-status role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  dialog.setAttribute('aria-labelledby', 'payment-schedule-title');
  dialog.setAttribute('aria-describedby', 'payment-schedule-help');
  const form = dialog.querySelector('form');
  const status = dialog.querySelector('[data-payment-schedule-status]');
  const submit = form.querySelector('[type="submit"]');
  dialog.querySelectorAll('[data-close-payment-schedule]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const open = (button) => {
    form.reset();
    form.elements.total.value = button.dataset.invoiceTotal || '1000';
    form.elements.deposit.value = Math.round(Number(form.elements.total.value) * 0.4 * 100) / 100;
    status.textContent = '';
    submit.disabled = false;
    dialog.dataset.invoiceId = button.dataset.invoiceId || '';
    dialog.showModal();
    form.elements.total.focus();
  };
  form.elements.total.addEventListener('input', () => {
    const total = Number(form.elements.total.value);
    if (Number.isFinite(total) && total > 0) form.elements.deposit.value = Math.min(Number(form.elements.deposit.value || 0), Math.max(0.01, Math.round(total * 0.4 * 100) / 100));
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const total = Number(form.elements.total.value);
    const deposit = Number(form.elements.deposit.value);
    if (!dialog.dataset.invoiceId || !Number.isFinite(total) || total <= 0 || !Number.isFinite(deposit) || deposit <= 0 || deposit >= total) {
      status.textContent = 'Enter a valid total and a deposit smaller than the invoice total.';
      return;
    }
    submit.disabled = true;
    status.textContent = 'Creating payment plan…';
    try {
      await repository.createPaymentSchedule(dialog.dataset.invoiceId, [{ amount: deposit, due: 'At booking' }, { amount: Number((total - deposit).toFixed(2)), due: 'On completion' }]);
      dialog.close();
      showToast('Payment plan created.');
      openRecords('invoices');
    } catch {
      status.textContent = 'Could not create the payment plan. Confirm the invoice total and try again.';
      submit.disabled = false;
    }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-invoice-action="schedule"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(button);
  }, true);
})();
