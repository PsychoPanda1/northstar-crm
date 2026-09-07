(() => {
  const recordList = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!recordList || !repository) return;

  let dialog;
  let activeCustomerId = '';
  let catalog = [];
  let overrides = [];

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const message = (text) => {
    const node = dialog?.querySelector('[data-pricing-message]');
    if (node) node.textContent = text;
  };
  const renderOverrides = () => {
    const node = dialog?.querySelector('[data-pricing-overrides]');
    if (!node) return;
    node.innerHTML = overrides.length
      ? overrides.map((item) => `<li><span>${escapeHtml(item.catalogItem)}</span><strong>$${Number(item.amount).toFixed(2)}</strong><small>Updated ${escapeHtml(new Date(item.updatedAt).toLocaleDateString())}</small></li>`).join('')
      : '<li class="muted">No negotiated prices saved for this customer.</li>';
  };
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'workflow-dialog';
    dialog.id = 'customer-pricing-dialog';
    dialog.innerHTML = '<button class="dialog-close" type="button" data-close-pricing aria-label="Close">×</button><div class="dialog-kicker">CUSTOMER PRICING</div><h2>Negotiated pricebook</h2><p>Save a customer-specific price without changing the shared service catalog.</p><form><label>Service<select name="catalogItemId" required></select></label><label>Customer price<input name="amount" type="number" min="0.01" max="1000000" step="0.01" required /></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-pricing>Cancel</button><button class="primary-btn" type="submit">Save price</button></div><p class="form-message" data-pricing-message role="status" aria-live="polite"></p></form><section class="profile-section"><span class="record-id">CURRENT OVERRIDES</span><ul class="pricing-overrides" data-pricing-overrides></ul></section>';
    document.body.append(dialog);
    dialog.querySelectorAll('[data-close-pricing]').forEach((button) => button.addEventListener('click', () => dialog.close()));
    const form = dialog.querySelector('form');
    const select = form.elements.catalogItemId;
    select.addEventListener('change', () => {
      const override = overrides.find((item) => item.catalogItemId === select.value);
      const item = catalog.find((candidate) => candidate.id === select.value);
      form.elements.amount.value = override ? Number(override.amount).toFixed(2) : String(Number(String(item?.priceFrom || '').match(/[0-9]+(?:\.[0-9]+)?/)?.[0] || 0).toFixed(2));
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = form.querySelector('[type="submit"]');
      const amount = Number(form.elements.amount.value);
      if (!activeCustomerId || !select.value || !Number.isFinite(amount) || amount <= 0) return;
      submit.disabled = true;
      message('Saving…');
      try {
        await repository.setCustomerPricing(activeCustomerId, select.value, amount);
        const refreshed = await repository.listCustomerPricing(activeCustomerId);
        overrides = refreshed.overrides || [];
        renderOverrides();
        message('Negotiated price saved.');
      } catch {
        message('Could not save the negotiated price. Confirm owner access and the amount.');
      } finally { submit.disabled = false; }
    });
    return dialog;
  };

  const open = async (button) => {
    activeCustomerId = button.dataset.customerPricing;
    const modal = ensureDialog();
    const form = modal.querySelector('form');
    const select = form.elements.catalogItemId;
    button.disabled = true;
    message('Loading pricebook…');
    try {
      const [catalogResult, pricingResult] = await Promise.all([repository.list('catalog'), repository.listCustomerPricing(activeCustomerId)]);
      catalog = (catalogResult || []).filter((item) => item.active !== false);
      overrides = pricingResult.overrides || [];
      select.innerHTML = catalog.length ? catalog.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} · ${escapeHtml(item.priceFrom || 'Price pending')}</option>`).join('') : '<option value="">No active services</option>';
      renderOverrides();
      if (!catalog.length) { message('Add an active service to the pricebook first.'); return; }
      select.dispatchEvent(new Event('change'));
      message('');
      modal.showModal();
      select.focus();
    } catch { message('Customer pricing is unavailable for this workspace.'); modal.showModal(); }
    finally { button.disabled = false; }
  };

  recordList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-customer-pricing]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(button);
  }, true);
})();
