(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#invoice-payment-schedule-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'invoice-payment-schedule-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-payment-schedule aria-label="Close">×</button><div class="dialog-kicker">RECEIVABLES</div><h2 id="payment-schedule-title">Create payment plan</h2><p id="payment-schedule-help">Set the booking deposit and completion balance for this invoice.</p><form><label>Remaining invoice balance<input name="total" type="number" min="0.01" step="0.01" required readonly /></label><label>Booking deposit<input name="deposit" type="number" min="0.01" step="0.01" required /></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-payment-schedule>Cancel</button><button class="primary-btn" type="submit" disabled>Create payment plan</button></div><p class="form-message" data-payment-schedule-status role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  dialog.setAttribute('aria-labelledby', 'payment-schedule-title');
  dialog.setAttribute('aria-describedby', 'payment-schedule-help');
  const form = dialog.querySelector('form');
  const status = dialog.querySelector('[data-payment-schedule-status]');
  const submit = form.querySelector('[type="submit"]');
  dialog.querySelectorAll('[data-close-payment-schedule]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const open = async (button) => {
    form.reset(); submit.disabled = true; status.textContent = 'Loading invoice balance…'; dialog.dataset.invoiceId = button.dataset.invoiceId || ''; dialog.showModal();
    try {
      const invoices = await repository.list('invoices', dialog.dataset.invoiceId);
      const invoice = invoices.find((item) => item.id === dialog.dataset.invoiceId);
      const total = Number(invoice?.amount ?? invoice?.total ?? 0);
      const paid = Number(invoice?.paidAmount || 0);
      const balance = Number((invoice?.balance ?? total - paid).toFixed(2));
      if (!Number.isFinite(balance) || balance <= 0) throw new Error('no_balance');
      form.elements.total.value = balance.toFixed(2);
      form.elements.deposit.value = Math.max(0.01, Math.round(balance * 0.4 * 100) / 100);
      status.textContent = `Remaining balance: $${balance.toFixed(2)}.`;
      submit.disabled = false;
      form.elements.deposit.focus();
    } catch { status.textContent = 'Could not load an unpaid invoice balance. Close and refresh the invoice list before trying again.'; }
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const total = Number(form.elements.total.value); const deposit = Number(form.elements.deposit.value);
    if (!dialog.dataset.invoiceId || !Number.isFinite(total) || total <= 0 || !Number.isFinite(deposit) || deposit <= 0 || deposit >= total) { status.textContent = 'Enter a deposit smaller than the remaining invoice balance.'; return; }
    submit.disabled = true; status.textContent = 'Creating payment plan…';
    try { await repository.createPaymentSchedule(dialog.dataset.invoiceId, [{ amount: deposit, due: 'At booking' }, { amount: Number((total - deposit).toFixed(2)), due: 'On completion' }]); dialog.close(); showToast('Payment plan created.'); openRecords('invoices'); }
    catch { status.textContent = 'Could not create the payment plan. Confirm the invoice balance and try again.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-invoice-action="schedule"]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); void open(button); }, true);
})();
