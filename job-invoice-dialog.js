(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#job-invoice-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'job-invoice-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-job-invoice aria-label="Close">×</button><div class="dialog-kicker">QUOTE TO CASH</div><h2>Create job invoice</h2><p data-job-invoice-help>Review the completed work, amount, payment terms, and billable scope before creating the customer invoice.</p><form><label>Invoice amount<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>Payment terms<select name="due"><option>Due on receipt</option><option selected>30 days</option><option>60 days</option><option>At booking</option></select></label><label>Line items <span>(one per line: Description | quantity | unit price)</span><textarea name="lineItems" rows="5" placeholder="Inspection | 1 | 149"></textarea></label><p class="form-hint" data-job-invoice-scope>Accepted estimate scope will be used when the amount and line items are unchanged.</p><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-job-invoice>Cancel</button><button class="primary-btn" type="submit">Create invoice</button></div><p class="form-message" data-job-invoice-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-job-invoice-message]');
  const help = dialog.querySelector('[data-job-invoice-help]');
  const scope = dialog.querySelector('[data-job-invoice-scope]');
  let jobId = '';
  let suggestedAmount = 0;
  let estimateLineItems = '';
  let hasEstimate = false;
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-job-invoice]').forEach((button) => button.addEventListener('click', close));
  const parseLineItems = (raw) => raw.split('\n').map((line) => { const [description, quantity, unitPrice] = line.split('|').map((value) => value.trim()); return { description, quantity: Number(quantity), unitPrice: Number(unitPrice) }; }).filter((item) => item.description || item.quantity || item.unitPrice);
  const open = async (id) => {
    jobId = id; message.textContent = 'Loading completed job…'; form.reset(); form.elements.due.value = '30 days'; dialog.showModal(); form.elements.amount.focus();
    try {
      const detail = await repository.getJobDetail(id);
      const recordedCost = Number(detail.costs?.material || 0) + Number(detail.costs?.labor || 0);
      suggestedAmount = Number(detail.estimate?.amount || detail.costs?.revenue || (recordedCost > 0 ? recordedCost : 500));
      hasEstimate = Boolean(detail.estimate);
      estimateLineItems = Array.isArray(detail.estimate?.lineItems) ? detail.estimate.lineItems.map((item) => `${item.description} | ${item.quantity} | ${item.unitPrice}`).join('\n') : '';
      form.elements.amount.value = suggestedAmount.toFixed(2);
      form.elements.lineItems.value = estimateLineItems;
      help.textContent = `${detail.job?.service || 'Completed service'} · ${detail.customer?.name || detail.job?.customer || 'Customer pending'}`;
      scope.textContent = hasEstimate && estimateLineItems ? 'Accepted estimate scope is preloaded. Keep it unchanged to invoice the sold scope and approved change orders.' : 'Add one billable line per row using Description | quantity | unit price.';
      message.textContent = '';
    } catch { message.textContent = 'Could not load the completed job pricing context.'; }
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const amount = Number(form.elements.amount.value);
    const raw = form.elements.lineItems.value.trim();
    const lineItems = parseLineItems(raw);
    if (!Number.isFinite(amount) || amount <= 0 || lineItems.some((item) => !item.description || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) { message.textContent = 'Use a positive amount and valid Description | quantity | unit price rows.'; return; }
    const useSoldScope = hasEstimate && amount === suggestedAmount && raw === estimateLineItems;
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message.textContent = 'Creating invoice…';
    try {
      const result = await repository.createJobInvoice(jobId, useSoldScope ? undefined : amount, form.elements.due.value, useSoldScope ? [] : lineItems, crypto.randomUUID());
      message.textContent = result.duplicate ? 'Invoice already exists for this job.' : 'Invoice created.';
      setTimeout(() => { close(); document.querySelector('[data-view="invoices"]')?.click(); }, 350);
    } catch { message.textContent = 'Could not create the job invoice. Confirm the job is completed and has a customer.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-job-invoice]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    void open(button.dataset.jobInvoice);
  }, true);
})();
