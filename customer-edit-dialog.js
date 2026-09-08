(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#customer-edit-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'customer-edit-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-customer-edit aria-label="Close">×</button><div class="dialog-kicker">CUSTOMER PROFILE</div><h2 id="customer-edit-title">Edit customer</h2><p id="customer-edit-help">Keep contact details accurate for booking, dispatch, and follow-up.</p><form><label>Customer name<input name="name" type="text" maxlength="120" autocomplete="name" required /></label><label>Phone<input name="phone" type="tel" maxlength="40" autocomplete="tel" required /></label><label>Email<input name="email" type="email" maxlength="160" autocomplete="email" /></label><label>Primary service address<input name="location" type="text" maxlength="240" autocomplete="street-address" /></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-customer-edit>Cancel</button><button class="primary-btn" type="submit">Save customer</button></div><p class="form-message" data-customer-edit-status role="status" aria-live="polite"></p></form>';
  dialog.setAttribute('aria-labelledby', 'customer-edit-title');
  dialog.setAttribute('aria-describedby', 'customer-edit-help');
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const status = dialog.querySelector('[data-customer-edit-status]');
  const submit = form.querySelector('[type="submit"]');
  dialog.querySelectorAll('[data-close-customer-edit]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const open = (button) => {
    dialog.dataset.customerId = button.dataset.customerId || '';
    form.elements.name.value = button.dataset.customerName || '';
    form.elements.phone.value = button.dataset.customerPhone || '';
    form.elements.email.value = button.dataset.customerEmail || '';
    form.elements.location.value = button.dataset.customerLocation || '';
    status.textContent = 'Changes are recorded in the tenant audit history.';
    submit.disabled = false; dialog.showModal(); form.elements.name.focus();
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    if (!dialog.dataset.customerId || values.name.trim().length < 2 || values.phone.trim().length < 3) { status.textContent = 'Enter a customer name and valid phone number.'; return; }
    submit.disabled = true; status.textContent = 'Saving customer…';
    try {
      const profile = await repository.updateCustomer(dialog.dataset.customerId, { name: values.name.trim(), phone: values.phone.trim(), email: values.email.trim(), location: values.location.trim() }, crypto.randomUUID());
      dialog.close(); drawerTitle.textContent = `${profile.name} profile`; const refreshed = await repository.getCustomerProfile(dialog.dataset.customerId); renderProfile(refreshed); showToast('Customer profile updated.');
    } catch { status.textContent = 'Could not update the customer. Confirm the contact details and try again.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-customer-action="edit"]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); open(button); }, true);
})();
