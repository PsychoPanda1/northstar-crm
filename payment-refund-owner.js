(() => {
  const recordList = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!recordList || !repository) return;

  let dialog;
  let paymentId = '';
  let refundable = 0;
  const message = (text) => { const node = dialog?.querySelector('[data-refund-message]'); if (node) node.textContent = text; };
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'workflow-dialog';
    dialog.id = 'payment-refund-dialog';
    dialog.innerHTML = '<button class="dialog-close" type="button" data-close-refund aria-label="Close">×</button><div class="dialog-kicker">PAYMENT LEDGER</div><h2>Refund payment</h2><p>Refund only the settled amount still available for this payment. The action is audited and updates the customer balance.</p><form><label>Refundable balance<input name="balance" type="text" readonly /></label><label>Refund amount<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>Reason<textarea name="reason" rows="3" maxlength="240" required>Customer request</textarea></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-refund>Cancel</button><button class="primary-btn" type="submit">Record refund</button></div><p class="form-message" data-refund-message role="status" aria-live="polite"></p></form>';
    document.body.append(dialog);
    dialog.querySelectorAll('[data-close-refund]').forEach((button) => button.addEventListener('click', () => dialog.close()));
    dialog.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const amount = Number(form.elements.amount.value);
      const reason = form.elements.reason.value.trim();
      if (!Number.isFinite(amount) || amount <= 0 || amount > refundable || !reason) { message(`Enter a refund from $0.01 to $${refundable.toFixed(2)} and include a reason.`); return; }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      message('Recording…');
      try {
        await repository.refundPayment(paymentId, amount, reason, crypto.randomUUID());
        message('Refund recorded.');
        setTimeout(() => dialog.close(), 500);
        document.querySelector('#payment-view')?.click();
      } catch { message('Could not record the refund. Confirm the role and provider settlement state.'); }
      finally { submit.disabled = false; }
    });
    return dialog;
  };

  recordList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-payment-refund]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    button.disabled = true;
    try {
      const payments = await repository.list('payments');
      const payment = payments.find((item) => item.id === button.dataset.paymentRefund);
      paymentId = button.dataset.paymentRefund;
      refundable = Number(payment?.refundableAmount ?? payment?.refundable ?? payment?.amount ?? 0);
      const modal = ensureDialog();
      const form = modal.querySelector('form');
      form.elements.balance.value = `$${Math.max(0, refundable).toFixed(2)}`;
      form.elements.amount.value = refundable > 0 ? refundable.toFixed(2) : '';
      message(refundable > 0 ? '' : 'No refundable balance is available for this payment.');
      modal.showModal();
      form.elements.amount.focus();
    } catch { message('Could not load the payment balance.'); ensureDialog().showModal(); }
    finally { button.disabled = false; }
  }, true);
})();
