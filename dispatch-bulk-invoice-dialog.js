(() => {
  const list = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!list || !repository?.bulkInvoiceJobs || document.querySelector('#dispatch-bulk-invoice-dialog')) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'dispatch-bulk-invoice-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-bulk-invoice aria-label="Close">×</button><div class="dialog-kicker">QUOTE TO CASH</div><h2>Invoice completed jobs</h2><p>Review each completed job amount, apply payment terms, and optionally use the same billable scope on every invoice.</p><form><div data-bulk-invoice-jobs></div><label>Payment terms<select name="due"><option>Due on receipt</option><option selected>30 days</option><option>60 days</option><option>At booking</option></select></label><label>Shared line items <span>(optional; one per line: Description | quantity | unit price)</span><textarea name="lineItems" rows="5" placeholder="Service visit | 1 | 500"></textarea></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-bulk-invoice>Cancel</button><button class="primary-btn" type="submit">Create invoices</button></div><p class="form-message" data-bulk-invoice-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);

  const form = dialog.querySelector('form');
  const jobsTarget = dialog.querySelector('[data-bulk-invoice-jobs]');
  const message = dialog.querySelector('[data-bulk-invoice-message]');
  let activeButton;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const selectedCompleted = () => [...list.querySelectorAll('[data-bulk-job]:checked')].map((input) => input.closest('[data-dispatch-job]')).filter((job) => job?.querySelector('.dispatch-job-meta span')?.textContent?.trim() === 'Completed');
  const parseLineItems = (raw) => raw.split('\n').map((line) => { const [description, quantity, unitPrice] = line.split('|').map((value) => value.trim()); return { description, quantity: Number(quantity), unitPrice: Number(unitPrice) }; }).filter((item) => item.description || item.quantity || item.unitPrice);
  const open = (button) => {
    const jobs = selectedCompleted();
    if (!jobs.length) { showToast('Select at least one completed job first.'); return; }
    activeButton = button;
    jobsTarget.innerHTML = jobs.map((job) => { const id = job.dataset.dispatchJob; const label = job.querySelector('h3')?.textContent?.trim() || 'Completed job'; const customer = job.querySelector('p')?.textContent?.split(' · ')[0] || id; return `<label class="bulk-invoice-row"><span><strong>${escape(label)}</strong><small>${escape(customer)} · ${escape(id)}</small></span><span>Amount<input type="number" min="0.01" step="0.01" value="500.00" data-bulk-invoice-amount="${escape(id)}" required /></span></label>`; }).join('');
    form.reset(); form.elements.due.value = '30 days'; message.textContent = `${jobs.length} completed job${jobs.length === 1 ? '' : 's'} selected.`; dialog.showModal(); jobsTarget.querySelector('input')?.focus();
  };
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-bulk-invoice]').forEach((button) => button.addEventListener('click', close));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const jobs = [...jobsTarget.querySelectorAll('[data-bulk-invoice-amount]')];
    if (!jobs.length || !form.reportValidity()) return;
    const amounts = Object.fromEntries(jobs.map((input) => [input.dataset.bulkInvoiceAmount, Number(input.value)]));
    if (Object.values(amounts).some((amount) => !Number.isFinite(amount) || amount <= 0)) { message.textContent = 'Enter a positive amount for every completed job.'; return; }
    const lineItems = parseLineItems(form.elements.lineItems.value.trim());
    if (lineItems.some((item) => !item.description || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) { message.textContent = 'Use valid Description | quantity | unit price rows, one per line.'; return; }
    const ids = jobs.map((input) => input.dataset.bulkInvoiceAmount);
    const lineItemsByJob = lineItems.length ? Object.fromEntries(ids.map((id) => [id, lineItems])) : {};
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; if (activeButton) activeButton.disabled = true; message.textContent = 'Creating invoices…';
    try { const result = await repository.bulkInvoiceJobs(ids, undefined, form.elements.due.value, crypto.randomUUID(), lineItemsByJob, amounts); message.textContent = `${result.invoices?.length || ids.length} invoice${ids.length === 1 ? '' : 's'} created.`; setTimeout(() => { close(); document.querySelector('[data-view="invoices"]')?.click(); }, 350); }
    catch { message.textContent = 'Bulk invoicing failed. Confirm the jobs have no existing invoices and line-item totals match each amount.'; submit.disabled = false; if (activeButton) activeButton.disabled = false; }
  });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-bulk-invoice]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); open(button); }, true);
})();
