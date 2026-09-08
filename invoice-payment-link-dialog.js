(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#invoice-payment-link-dialog')) return;
  const dialog = document.createElement('dialog'); dialog.id = 'invoice-payment-link-dialog'; dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-invoice-link aria-label="Close">×</button><div class="dialog-kicker">CUSTOMER PAYMENTS</div><h2 id="invoice-link-title">Share payment link</h2><p id="invoice-link-help">The server generates a short-lived link scoped to this invoice. Share it only with the intended customer.</p><form><label>Secure payment link<input name="url" type="url" readonly /></label><p class="form-message" data-invoice-link-expiry role="status" aria-live="polite"></p><div class="workflow-actions"><button class="ghost-btn" type="button" data-copy-invoice-link disabled>Copy link</button><button class="ghost-btn" type="button" data-close-invoice-link>Close</button></div><p class="form-message" data-invoice-link-status role="status" aria-live="polite"></p></form>';
  document.body.append(dialog); dialog.setAttribute('aria-labelledby', 'invoice-link-title'); dialog.setAttribute('aria-describedby', 'invoice-link-help');
  const form = dialog.querySelector('form'); const urlInput = form.elements.url; const expiry = dialog.querySelector('[data-invoice-link-expiry]'); const status = dialog.querySelector('[data-invoice-link-status]'); const copy = dialog.querySelector('[data-copy-invoice-link]');
  dialog.querySelectorAll('[data-close-invoice-link]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(urlInput.value); status.textContent = 'Payment link copied.'; } catch { urlInput.select(); status.textContent = 'Copy was unavailable; the link is selected for manual copying.'; } });
  const open = async (button) => {
    status.textContent = 'Generating secure payment link…'; expiry.textContent = ''; urlInput.value = ''; copy.disabled = true; dialog.showModal();
    try { const result = await repository.invoicePaymentLink(button.dataset.invoiceId); urlInput.value = new URL(result.url, window.location.href).href; expiry.textContent = result.expiresAt ? `Expires ${new Date(result.expiresAt).toLocaleString()}.` : (result.expiresInHours ? `Expires in ${result.expiresInHours} hours.` : 'Expiry is enforced by the server.'); status.textContent = 'Link ready. Copy it only to the intended customer.'; copy.disabled = false; urlInput.focus(); urlInput.select(); } catch { status.textContent = 'Payment link unavailable. Confirm the invoice has an outstanding balance.'; }
  };
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-invoice-link-action]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); void open(button); }, true);
})();
