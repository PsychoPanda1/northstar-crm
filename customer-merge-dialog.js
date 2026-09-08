(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#customer-merge-dialog')) return;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const dialog = document.createElement('dialog');
  dialog.id = 'customer-merge-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-customer-merge aria-label="Close">×</button><div class="dialog-kicker">DATA QUALITY</div><h2 id="customer-merge-title">Merge duplicate customer</h2><p id="customer-merge-help">Move linked jobs, invoices, messages, and history from the duplicate into this customer. The duplicate remains as a merged record.</p><form><label>Duplicate customer<select name="duplicateId" required><option value="">Loading customers…</option></select></label><label class="checkbox-field"><input name="confirm" type="checkbox" required /> I verified this is the duplicate record and want to merge it.</label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-customer-merge>Cancel</button><button class="primary-btn" type="submit">Merge customer</button></div><p class="form-message" data-customer-merge-status role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  dialog.setAttribute('aria-labelledby', 'customer-merge-title');
  dialog.setAttribute('aria-describedby', 'customer-merge-help');
  const form = dialog.querySelector('form');
  const select = form.elements.duplicateId;
  const status = dialog.querySelector('[data-customer-merge-status]');
  const submit = form.querySelector('[type="submit"]');
  let primaryId = '';
  dialog.querySelectorAll('[data-close-customer-merge]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const open = async (button) => {
    primaryId = button.dataset.customerMerge || '';
    form.reset(); submit.disabled = false; status.textContent = 'Loading customers…';
    dialog.showModal();
    try {
      const customers = await repository.list('customers');
      const choices = customers.filter((item) => item.id !== primaryId);
      select.innerHTML = choices.length ? `<option value="">Choose the duplicate record</option>${choices.map((item) => `<option value="${esc(item.id)}">${esc(item.name || item.id)} · ${esc(item.phone || item.email || 'No contact')}</option>`).join('')}` : '<option value="">No other customers found</option>';
      status.textContent = choices.length ? '' : 'A second customer is required before merging.';
      select.focus();
    } catch { status.textContent = 'Could not load customers for duplicate review.'; }
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity() || !primaryId || select.value === primaryId) return;
    submit.disabled = true; status.textContent = 'Merging customer records…';
    try {
      const result = await repository.mergeCustomer(primaryId, select.value);
      dialog.close(); showToast(`${result.reassigned || 0} linked record${result.reassigned === 1 ? '' : 's'} reassigned.`); openRecords('customers');
    } catch { status.textContent = 'Could not merge customers. Confirm both records belong to this workspace and are not already merged.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-customer-merge]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation(); void open(button);
  }, true);
})();
