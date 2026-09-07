(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#asset-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'asset-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-asset aria-label="Close">×</button><div class="dialog-kicker">EQUIPMENT HISTORY</div><h2>Add customer equipment</h2><p>Attach equipment to the right customer so future service visits, warranty context, and asset history stay connected.</p><form><label>Customer<select name="customerId" required><option value="">Loading customers…</option></select></label><label>Equipment name<input name="name" type="text" maxlength="120" required placeholder="Water heater, HVAC unit, pressure washer…" /></label><label>Serial number <span>(optional)</span><input name="serial" type="text" maxlength="100" placeholder="Not recorded" /></label><label>Installed date <span>(optional)</span><input name="installed" type="date" /></label><label>Warranty through <span>(optional)</span><input name="warrantyThrough" type="date" /></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-asset>Cancel</button><button class="primary-btn" type="submit">Save equipment</button></div><p class="form-message" data-asset-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-asset-message]');
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-asset]').forEach((button) => button.addEventListener('click', close));
  const open = async () => {
    form.reset(); message.textContent = 'Loading customers…';
    const select = form.elements.customerId;
    try {
      const customers = await repository.list('customers');
      select.innerHTML = customers.length ? `<option value="">Choose a customer</option>${customers.map((item) => `<option value="${String(item.id).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">${String(item.name || item.id).replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]))} · ${String(item.phone || 'No phone').replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]))}</option>`).join('')}` : '<option value="">No customers found</option>';
      message.textContent = customers.length ? '' : 'Add a customer before attaching equipment.';
      dialog.showModal();
      select.focus();
    } catch { message.textContent = 'Could not load customers for equipment setup.'; dialog.showModal(); }
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const customer = form.elements.customerId.selectedOptions[0];
    const name = form.elements.name.value.trim();
    const serial = form.elements.serial.value.trim() || 'Not recorded';
    const installed = form.elements.installed.value || 'Date pending';
    const warrantyThrough = form.elements.warrantyThrough.value || '';
    if (!customer?.value || !name || name.length > 120) { message.textContent = 'Choose a customer and enter an equipment name up to 120 characters.'; return; }
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message.textContent = 'Saving equipment…';
    try {
      await repository.createAsset(customer.textContent.split(' · ')[0], name, serial, installed, warrantyThrough, customer.value);
      message.textContent = 'Customer equipment saved.';
      setTimeout(() => { close(); document.querySelector('#asset-view')?.click(); }, 500);
    } catch { message.textContent = 'Could not save equipment. Check the customer and warranty dates.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('#add-asset');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    void open();
  }, true);
})();
