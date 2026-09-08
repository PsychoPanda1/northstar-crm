(() => {
  const recordList = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!recordList || !repository) return;

  let dialog;
  let invoiceId = '';
  let balance = 0;
  const message = (text) => { const node = dialog?.querySelector('[data-payment-message]'); if (node) node.textContent = text; };
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'workflow-dialog';
    dialog.id = 'invoice-payment-dialog';
    dialog.innerHTML = '<button class="dialog-close" type="button" data-close-payment aria-label="Close">×</button><div class="dialog-kicker">INVOICE PAYMENTS</div><h2>Record payment</h2><p>Record a settled payment against the invoice. Partial collections keep the remaining balance accurate.</p><form><label>Remaining balance<input name="balance" type="text" readonly /></label><label>Payment amount<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>Payment method<select name="method"><option>Card</option><option>Cash</option><option>Check</option><option>ACH</option><option>Other</option></select></label><label>Reference <span>(optional)</span><input name="reference" maxlength="100" placeholder="Receipt, check, or transaction reference" /></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-payment>Cancel</button><button class="primary-btn" type="submit">Record payment</button></div><p class="form-message" data-payment-message role="status" aria-live="polite"></p></form>';
    document.body.append(dialog);
    dialog.querySelectorAll('[data-close-payment]').forEach((button) => button.addEventListener('click', () => dialog.close()));
    dialog.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const amount = Number(form.elements.amount.value);
      const reference = form.elements.reference.value.trim();
      if (!invoiceId || !Number.isFinite(balance) || balance <= 0 || !Number.isFinite(amount) || amount <= 0 || amount > balance) { message(`Enter an amount from $0.01 to $${Math.max(0, balance).toFixed(2)}.`); return; }
      if (reference.length > 100) { message('Reference must be 100 characters or fewer.'); return; }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      message('Recording…');
      try {
        await repository.payInvoice(invoiceId, amount, form.elements.method.value, reference, crypto.randomUUID());
        message('Payment recorded.');
        setTimeout(() => { dialog.close(); document.querySelector('[data-view="invoices"]')?.click(); }, 450);
      } catch { message('Could not record the payment. Confirm the invoice balance, role, and payment details.'); }
      finally { submit.disabled = false; }
    });
    return dialog;
  };

  recordList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-invoice-action="pay"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    button.disabled = true;
    try {
      const invoices = await repository.list('invoices', button.dataset.invoiceId);
      const invoice = invoices.find((item) => item.id === button.dataset.invoiceId);
      const total = Number(invoice?.amount || invoice?.total || 0);
      const paid = Number(invoice?.paidAmount || 0);
      balance = Math.max(0, Number((invoice?.balance ?? total - paid).toFixed(2)));
      invoiceId = button.dataset.invoiceId;
      const modal = ensureDialog();
      const form = modal.querySelector('form');
      form.elements.balance.value = `$${balance.toFixed(2)}`;
      form.elements.amount.value = balance > 0 ? balance.toFixed(2) : '';
      form.elements.reference.value = '';
      message(balance > 0 ? '' : 'No unpaid balance is available for this invoice.');
      modal.showModal();
      form.elements.amount.focus();
    } catch { message('Could not load the invoice balance.'); ensureDialog().showModal(); }
    finally { button.disabled = false; }
  }, true);
})();
