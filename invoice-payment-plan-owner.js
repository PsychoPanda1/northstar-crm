(() => {
  const recordList = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!recordList || !repository) return;

  let dialog;
  let invoiceId = '';
  let invoiceTotal = 0;
  const message = (text) => { const node = dialog?.querySelector('[data-plan-message]'); if (node) node.textContent = text; };
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'workflow-dialog';
    dialog.id = 'invoice-payment-plan-dialog';
    dialog.innerHTML = '<button class="dialog-close" type="button" data-close-plan aria-label="Close">×</button><div class="dialog-kicker">INVOICE PAYMENTS</div><h2>Payment plan</h2><p>Split this invoice into a deposit and a completion payment. The schedule is saved against the invoice and shown to the customer.</p><form><label>Invoice total<input name="total" type="text" readonly /></label><label>Deposit amount<input name="deposit" type="number" min="0.01" step="0.01" required /></label><label>Deposit due<select name="depositDue"><option>At booking</option><option>Due today</option><option>Due on receipt</option></select></label><label>Remaining payment due<select name="remainingDue"><option>On completion</option><option>30 days</option><option>Due on receipt</option></select></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-plan>Cancel</button><button class="primary-btn" type="submit">Save payment plan</button></div><p class="form-message" data-plan-message role="status" aria-live="polite"></p></form><div class="profile-section"><span class="record-id">CUSTOMER-FACING RESULT</span><p data-plan-summary>Deposit and remaining balance will appear here.</p></div>';
    document.body.append(dialog);
    dialog.querySelectorAll('[data-close-plan]').forEach((button) => button.addEventListener('click', () => dialog.close()));
    const form = dialog.querySelector('form');
    form.elements.deposit.addEventListener('input', () => {
      const deposit = Number(form.elements.deposit.value);
      const remaining = invoiceTotal - deposit;
      dialog.querySelector('[data-plan-summary]').textContent = Number.isFinite(deposit) && remaining > 0 ? `Deposit $${deposit.toFixed(2)} · remaining $${remaining.toFixed(2)} due ${form.elements.remainingDue.value.toLowerCase()}.` : 'Deposit must be less than the invoice total.';
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const deposit = Number(form.elements.deposit.value);
      const remaining = Number((invoiceTotal - deposit).toFixed(2));
      if (!invoiceId || !Number.isFinite(invoiceTotal) || invoiceTotal <= 0 || !Number.isFinite(deposit) || deposit <= 0 || remaining <= 0) { message('Enter a deposit greater than zero and less than the invoice total.'); return; }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      message('Saving…');
      try {
        await repository.createPaymentSchedule(invoiceId, [{ amount: deposit, due: form.elements.depositDue.value }, { amount: remaining, due: form.elements.remainingDue.value }]);
        message('Payment plan saved and ready to share.');
        dialog.querySelector('[data-plan-summary]').textContent = `Deposit $${deposit.toFixed(2)} · remaining $${remaining.toFixed(2)}.`;
      } catch { message('Could not save the payment plan. Confirm the invoice is open and has no existing schedule.'); }
      finally { submit.disabled = false; }
    });
    return dialog;
  };

  recordList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-invoice-action="schedule"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    button.disabled = true;
    try {
      const invoices = await repository.list('invoices');
      const invoice = invoices.find((item) => item.id === button.dataset.invoiceId);
      invoiceId = button.dataset.invoiceId;
      invoiceTotal = Number(invoice?.amount || invoice?.total || invoice?.balance || 0);
      const modal = ensureDialog();
      const form = modal.querySelector('form');
      form.elements.total.value = invoiceTotal > 0 ? `$${invoiceTotal.toFixed(2)}` : 'Unavailable';
      form.elements.deposit.value = invoiceTotal > 0 ? Math.round(invoiceTotal * 0.4 * 100) / 100 : '';
      form.elements.deposit.dispatchEvent(new Event('input'));
      message(invoiceTotal > 0 ? '' : 'Invoice total could not be loaded.');
      modal.showModal();
      form.elements.deposit.focus();
    } catch { message('Could not load the invoice total.'); ensureDialog().showModal(); }
    finally { button.disabled = false; }
  }, true);
})();
