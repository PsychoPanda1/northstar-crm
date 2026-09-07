(() => {
  const list = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!list || !repository) return;
  let dialog;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const toast = (text) => { const node = document.querySelector('#toast'); if (!node) return; node.textContent = text; node.classList.add('show'); setTimeout(() => node.classList.remove('show'), 2800); };
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'invoice-bill-to-dialog';
    dialog.className = 'workflow-dialog';
    dialog.innerHTML = '<form method="dialog" class="workflow-dialog__form"><h2>Set invoice bill-to</h2><p>Capture the account or contact responsible for this invoice. The server validates the profile and payment terms before saving.</p><label>Account or contact name<input name="name" type="text" minlength="2" maxlength="160" required autocomplete="organization" /></label><label>Email<input name="email" type="email" maxlength="254" autocomplete="email" /></label><label>Phone<input name="phone" type="tel" maxlength="40" autocomplete="tel" /></label><label>Billing address<textarea name="address" rows="3" maxlength="500" autocomplete="street-address"></textarea></label><label>Payment terms<select name="terms" required><option>Due on receipt</option><option>Net 15</option><option>Net 30</option><option>Net 45</option><option>Net 60</option></select></label><p id="invoice-bill-to-error" role="alert" class="workflow-dialog__error"></p><div class="workflow-dialog__actions"><button value="cancel">Cancel</button><button id="invoice-bill-to-submit" value="default">Save bill-to</button></div></form>';
    document.body.append(dialog);
    return dialog;
  };
  const open = async (button) => {
    const modal = ensureDialog();
    const form = modal.querySelector('form');
    const submit = modal.querySelector('#invoice-bill-to-submit');
    const error = modal.querySelector('#invoice-bill-to-error');
    form.reset();
    error.textContent = '';
    try {
      const invoice = (await repository.list('invoices')).find((item) => item.id === button.dataset.invoiceBillTo);
      const existing = invoice?.billTo || {};
      for (const name of ['name', 'email', 'phone', 'address', 'terms']) if (existing[name] !== undefined) form.elements[name].value = existing[name];
    } catch {}
    modal.showModal();
    form.elements.name.focus();
    form.onsubmit = async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const billTo = Object.fromEntries(new FormData(form).entries());
      submit.disabled = true;
      error.textContent = '';
      try {
        await repository.updateInvoiceBillTo(button.dataset.invoiceBillTo, billTo);
        modal.close();
        button.textContent = 'Bill-to saved';
        toast('Invoice bill-to profile saved.');
      } catch (failure) {
        error.textContent = failure?.message === 'valid_bill_to_profile_required' ? 'Enter a valid bill-to profile and payment term.' : 'Could not save invoice bill-to details.';
        submit.disabled = false;
      }
    };
  };
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-invoice-bill-to]');
    if (!button || button.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void open(button);
  }, true);
})();
