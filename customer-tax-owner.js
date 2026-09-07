(() => {
  const recordList = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!recordList || !repository) return;
  let dialog;
  let activeCustomerId = '';
  const message = (text) => { const node = dialog?.querySelector('[data-tax-message]'); if (node) node.textContent = text; };
  const syncFields = () => {
    const form = dialog?.querySelector('form');
    const exempt = form?.elements.status.value === 'EXEMPT';
    const number = form?.querySelector('[data-exemption-number]')?.closest('label');
    const expires = form?.querySelector('[data-exemption-expires]')?.closest('label');
    if (number) number.hidden = !exempt;
    if (expires) expires.hidden = !exempt;
    if (form?.elements.exemptionNumber) form.elements.exemptionNumber.required = exempt;
  };
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'workflow-dialog';
    dialog.id = 'customer-tax-dialog';
    dialog.innerHTML = '<button class="dialog-close" type="button" data-close-tax aria-label="Close">×</button><div class="dialog-kicker">CUSTOMER BILLING</div><h2>Tax status</h2><p>Keep exemption details attached to this customer without changing workspace-wide tax settings.</p><form><label>Customer status<select name="status" required><option value="TAXABLE">Taxable</option><option value="EXEMPT">Tax exempt</option></select></label><label hidden>Exemption number<input data-exemption-number name="exemptionNumber" type="text" maxlength="100" /></label><label hidden>Exemption expiration <span>(optional)</span><input data-exemption-expires name="exemptionExpiresAt" type="date" /></label><p class="form-hint">An exemption number is required when the customer is tax exempt. Owner authorization is enforced by the API.</p><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-tax>Cancel</button><button class="primary-btn" type="submit">Save tax status</button></div><p class="form-message" data-tax-message role="status" aria-live="polite"></p></form>';
    document.body.append(dialog);
    dialog.querySelectorAll('[data-close-tax]').forEach((button) => button.addEventListener('click', () => dialog.close()));
    const form = dialog.querySelector('form');
    form.elements.status.addEventListener('change', syncFields);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity() || !activeCustomerId) return;
      const exempt = form.elements.status.value === 'EXEMPT';
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      message('Saving tax status…');
      try {
        const result = await repository.updateCustomerTaxStatus(activeCustomerId, exempt, exempt ? form.elements.exemptionNumber.value.trim() : '', exempt ? form.elements.exemptionExpiresAt.value : '');
        message(result.duplicate ? 'Tax status was already saved.' : 'Customer tax status saved.');
        setTimeout(() => dialog.close(), 500);
      } catch { message('Could not save tax status. Confirm owner access and exemption details.'); submit.disabled = false; }
    });
    return dialog;
  };
  const open = async (button) => {
    activeCustomerId = button.dataset.customerTaxStatus;
    const modal = ensureDialog();
    const form = modal.querySelector('form');
    button.disabled = true;
    message('Loading current tax status…');
    try {
      const current = await repository.getCustomerTaxStatus(activeCustomerId);
      form.elements.status.value = current.taxExempt ? 'EXEMPT' : 'TAXABLE';
      form.elements.exemptionNumber.value = current.exemptionNumber || '';
      form.elements.exemptionExpiresAt.value = current.exemptionExpiresAt ? String(current.exemptionExpiresAt).slice(0, 10) : '';
      syncFields();
      message('');
      modal.showModal();
      form.elements.status.focus();
    } catch { message('Customer tax status is unavailable for this workspace.'); modal.showModal(); }
    finally { button.disabled = false; }
  };
  recordList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-customer-tax-status]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    void open(button);
  }, true);
})();
