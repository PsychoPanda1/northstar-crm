(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#estimate-line-items-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'estimate-line-items-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-estimate-lines aria-label="Close">×</button><div class="dialog-kicker">ESTIMATE SCOPE</div><h2>Configure estimate pricing</h2><p>Build a transparent customer-facing scope with one billable item per line.</p><form><label>Line items <span>(one per line: Description | quantity | unit price)</span><textarea name="lineItems" rows="7" required placeholder="Inspection | 1 | 149\nRepair | 1 | 289"></textarea></label><div class="workflow-actions"><label style="flex:1">Discount<input name="discount" type="number" min="0" step="0.01" value="0" /></label><label style="flex:1">Tax rate (%)<input name="taxRate" type="number" min="0" max="30" step="0.01" value="0" /></label></div><p class="form-hint" data-estimate-lines-summary>Enter valid quantities and non-negative prices.</p><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-estimate-lines>Cancel</button><button class="primary-btn" type="submit">Save estimate scope</button></div><p class="form-message" data-estimate-lines-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-estimate-lines-message]');
  const summary = dialog.querySelector('[data-estimate-lines-summary]');
  let estimateId = '';
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-estimate-lines]').forEach((button) => button.addEventListener('click', close));
  const parseItems = () => form.elements.lineItems.value.split('\n').map((line) => { const [description, quantity, unitPrice] = line.split('|').map((value) => value.trim()); return { description, quantity: Number(quantity), unitPrice: Number(unitPrice) }; }).filter((item) => item.description || item.quantity || item.unitPrice);
  const updateSummary = () => { const items = parseItems(); const subtotal = items.reduce((sum, item) => sum + (Number.isFinite(item.quantity) && Number.isFinite(item.unitPrice) ? item.quantity * item.unitPrice : 0), 0); summary.textContent = items.length ? `${items.length} item${items.length === 1 ? '' : 's'} · subtotal $${subtotal.toFixed(2)} before discount and tax.` : 'Enter valid quantities and non-negative prices.'; };
  form.elements.lineItems.addEventListener('input', updateSummary);
  const open = async (id) => {
    estimateId = id; form.reset(); form.elements.discount.value = '0'; form.elements.taxRate.value = '0'; message.textContent = 'Loading estimate…'; dialog.showModal(); form.elements.lineItems.focus();
    try {
      const estimates = await repository.list('estimates');
      const estimate = (Array.isArray(estimates) ? estimates : estimates.items || []).find((item) => item.id === id);
      if (!estimate) throw new Error('estimate_not_found');
      form.elements.lineItems.value = (estimate.lineItems || []).map((item) => `${item.description} | ${item.quantity} | ${item.unitPrice}`).join('\n');
      form.elements.discount.value = Number(estimate.discount || 0).toFixed(2);
      form.elements.taxRate.value = Number(estimate.taxRate || 0).toFixed(2);
      updateSummary(); message.textContent = '';
    } catch { message.textContent = 'Could not load the estimate. Confirm it is still open.'; }
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const items = parseItems(); const discount = Number(form.elements.discount.value); const taxRate = Number(form.elements.taxRate.value);
    if (!items.length || items.some((item) => !item.description || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0) || !Number.isFinite(discount) || discount < 0 || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 30) { message.textContent = 'Use valid Description | quantity | unit price rows, a non-negative discount, and tax from 0 to 30%.'; return; }
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message.textContent = 'Saving estimate scope…';
    try { await repository.updateEstimateLineItems(estimateId, items, discount, taxRate, crypto.randomUUID()); message.textContent = 'Estimate scope saved.'; setTimeout(() => { close(); document.querySelector('[data-view="estimates"]')?.click(); }, 350); }
    catch { message.textContent = 'Could not save estimate scope. Confirm the estimate is still draft or awaiting changes.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-estimate-line-items]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    void open(button.dataset.estimateLineItems);
  }, true);
})();
