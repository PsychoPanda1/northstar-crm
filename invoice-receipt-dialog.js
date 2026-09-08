(() => {
  const repository = window.northstarRepository;
  if (!repository?.getInvoiceReceipt || !document.querySelector('#record-list') || document.querySelector('#invoice-receipt-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'invoice-receipt-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-receipt aria-label="Close">×</button><div class="dialog-kicker">INVOICE PAYMENTS</div><h2>Payment receipt</h2><p>Review the settled payment history for this invoice and copy a concise customer-safe summary.</p><div data-receipt-content class="profile-section"><p class="muted">Loading receipt…</p></div><div class="workflow-actions"><button class="ghost-btn" type="button" data-copy-receipt disabled>Copy summary</button><button class="primary-btn" type="button" data-close-receipt>Close</button></div><p class="form-message" data-receipt-message role="status" aria-live="polite"></p>';
  document.body.append(dialog);
  const content = dialog.querySelector('[data-receipt-content]');
  const status = dialog.querySelector('[data-receipt-message]');
  const copy = dialog.querySelector('[data-copy-receipt]');
  let summary = '';
  const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  dialog.querySelectorAll('[data-close-receipt]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(summary); status.textContent = 'Receipt summary copied.'; } catch { status.textContent = 'Copy is unavailable in this browser. Select the receipt text manually.'; } });
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-invoice-receipt]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation(); button.disabled = true; content.innerHTML = '<p class="muted">Loading receipt…</p>'; status.textContent = ''; copy.disabled = true; dialog.showModal();
    try {
      const receipt = await repository.getInvoiceReceipt(button.dataset.invoiceReceipt);
      const payments = receipt.payments || [];
      summary = [`${receipt.receiptNumber}`, `${receipt.invoice.customer} · ${receipt.invoice.id}`, `Status: ${receipt.invoice.status}`, `Total: $${Number(receipt.total).toFixed(2)}`, `Paid: $${Number(receipt.paidAmount).toFixed(2)}`, `Balance: $${Number(receipt.balance).toFixed(2)}`, '', ...payments.map((payment) => `${payment.method} · $${Number(payment.amount).toFixed(2)} · ${payment.reference}`)].join('\n');
      content.innerHTML = `<span class="record-id">${escape(receipt.receiptNumber)}</span><h3>${escape(receipt.invoice.customer)} · ${escape(receipt.invoice.id)}</h3><p>Status: ${escape(receipt.invoice.status)} · Total $${Number(receipt.total).toFixed(2)} · Paid $${Number(receipt.paidAmount).toFixed(2)} · Balance $${Number(receipt.balance).toFixed(2)}</p>${payments.length ? `<ul class="summary-list">${payments.map((payment) => `<li><strong>${escape(payment.method)}</strong><span>$${Number(payment.amount).toFixed(2)} · ${escape(payment.reference)}</span></li>`).join('')}</ul>` : '<p class="muted">No payments have been recorded.</p>'}`;
      copy.disabled = false; status.textContent = 'Receipt loaded.';
    } catch { content.innerHTML = '<p class="muted">Receipt details could not be loaded.</p>'; status.textContent = 'Could not load the invoice receipt. Check your session and try again.'; }
    finally { button.disabled = false; }
  }, true);
})();
