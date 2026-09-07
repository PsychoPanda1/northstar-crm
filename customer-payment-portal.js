(() => {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  if (!token) return;
  const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const message = (value) => { const target = document.querySelector('#message'); if (target) target.textContent = value; };
  const retryKey = (scope, body) => globalThis.northstarPortalRetryKey?.(scope, body) || globalThis.crypto?.randomUUID?.() || `${scope}-${Date.now()}`;
  const portal = () => window.__northstarPortal || {};
  const dialog = document.createElement('dialog');
  dialog.className = 'workflow-dialog';
  dialog.id = 'customer-payment-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-payment aria-label="Close">×</button><div class="dialog-kicker" data-payment-kicker>SECURE CUSTOMER PAYMENT</div><h2 data-payment-title>Start payment</h2><p data-payment-help>Choose the amount and method. Card and bank details are handled by the payment provider.</p><form data-payment-form><label>Installment <select name="installmentId"><option value="">Remaining balance</option></select></label><label>Amount<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>Method<select name="method"><option>Card</option><option>ACH</option></select></label><label data-financing-provider hidden>Provider preference (optional)<input name="provider" maxlength="120" placeholder="Provider pending" /></label><label data-financing-term hidden>Term<select name="termMonths"><option value="6">6 months</option><option value="12" selected>12 months</option><option value="18">18 months</option><option value="24">24 months</option><option value="36">36 months</option><option value="48">48 months</option><option value="60">60 months</option></select></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-payment>Cancel</button><button class="primary-btn" type="submit" data-payment-submit>Submit payment</button></div><p class="form-message" data-payment-status role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  dialog.querySelectorAll('[data-close-payment]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const open = (button, financing) => {
    const invoice = portal().invoices?.find((item) => item.id === button.dataset.invoiceId);
    const estimate = financing && !invoice ? portal().estimates?.find((item) => item.id === button.dataset.estimateId) : null;
    if (!invoice && !estimate) return;
    const form = dialog.querySelector('[data-payment-form]');
    const installments = form.elements.installmentId;
    const schedule = (invoice?.schedule || []).filter((item) => item.status !== 'Paid');
    installments.innerHTML = '<option value="">Remaining balance</option>' + schedule.map((item) => `<option value="${escape(item.id)}">Payment ${escape(item.sequence)} · ${escape(item.due)} · $${(Number(item.amount) - Number(item.paidAmount || 0)).toFixed(2)}</option>`).join('');
    const rawAmount = invoice?.balance !== undefined && invoice?.balance !== null ? invoice.balance : Number(String(estimate?.value || '').replace(/[^\d.-]/g, ''));
    form.elements.amount.value = Number(rawAmount || 0).toFixed(2);
    form.elements.method.value = 'Card'; form.elements.provider.value = 'Provider pending'; form.elements.termMonths.value = '12';
    form.dataset.invoiceId = invoice?.id || ''; form.dataset.estimateId = estimate?.id || ''; form.dataset.mode = financing ? 'financing' : 'payment';
    dialog.querySelector('[data-payment-kicker]').textContent = financing ? 'FINANCING REQUEST' : 'SECURE CUSTOMER PAYMENT';
    dialog.querySelector('[data-payment-title]').textContent = financing ? 'Request financing' : 'Start payment';
    dialog.querySelector('[data-payment-help]').textContent = financing ? 'Send a financing request for review. The financing provider makes the final decision.' : 'Choose the amount and method. Card and bank details are handled by the payment provider.';
    dialog.querySelector('[data-payment-submit]').textContent = financing ? 'Send request' : 'Submit payment';
    dialog.querySelector('[data-financing-provider]').hidden = !financing; dialog.querySelector('[data-financing-term]').hidden = !financing;
    installments.closest('label').hidden = financing || !schedule.length; form.elements.method.closest('label').hidden = financing;
    dialog.querySelector('[data-payment-status]').textContent = ''; dialog.showModal();
  };
  dialog.querySelector('[data-payment-form]').addEventListener('submit', async (event) => {
    event.preventDefault(); const form = event.currentTarget; const financing = form.dataset.mode === 'financing'; const amount = Number(form.elements.amount.value); const termMonths = Number(form.elements.termMonths.value); const status = dialog.querySelector('[data-payment-status]');
    if (!Number.isFinite(amount) || amount <= 0) { status.textContent = 'Enter a valid amount.'; return; }
    if (financing && ![6, 12, 18, 24, 36, 48, 60].includes(termMonths)) { status.textContent = 'Choose a valid financing term.'; return; }
    const payload = financing ? { ...(form.dataset.invoiceId ? { invoiceId: form.dataset.invoiceId } : { estimateId: form.dataset.estimateId }), amount, termMonths, provider: form.elements.provider.value.trim() || 'Provider pending' } : { invoiceId: form.dataset.invoiceId, amount, method: form.elements.method.value, ...(form.elements.installmentId.value ? { installmentId: form.elements.installmentId.value } : {}) };
    const submit = dialog.querySelector('[data-payment-submit]'); submit.disabled = true; status.textContent = financing ? 'Sending request…' : 'Submitting payment…';
    try {
      const endpoint = financing ? '/api/public/customer-portal/financing-intent' : '/api/public/customer-portal/payment-intent';
      const response = await fetch(endpoint + `?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': retryKey(financing ? 'financing-intent' : 'payment-intent', payload) }, body: JSON.stringify(payload) });
      if (!response.ok) { status.textContent = financing ? 'Financing request could not be sent.' : 'Payment could not be submitted.'; return; }
      message(financing ? 'Financing request sent. A provider decision is still pending.' : 'Payment submitted for provider confirmation.'); dialog.close(); window.location.reload();
    } catch { status.textContent = financing ? 'Financing request could not be sent. Try again.' : 'Payment could not be submitted. Try again.'; } finally { submit.disabled = false; }
  });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-action="pay"], [data-action="finance"], [data-action="finance-estimate"]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); open(button, button.dataset.action !== 'pay'); }, true);
})();
