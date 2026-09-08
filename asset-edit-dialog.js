(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#asset-edit-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'asset-edit-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-asset-edit aria-label="Close">×</button><div class="dialog-kicker">EQUIPMENT RECORD</div><h2>Edit customer equipment</h2><p>Keep the equipment record, warranty context, and lifecycle status accurate for the next visit.</p><form><label>Equipment name<input name="name" type="text" maxlength="120" required /></label><label>Serial number <span>(optional)</span><input name="serial" type="text" maxlength="100" /></label><label>Installed date <span>(optional)</span><input name="installed" type="date" /></label><label>Warranty through <span>(optional)</span><input name="warrantyThrough" type="date" /></label><label>Status<select name="status" required><option>Active</option><option>Retired</option></select></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-asset-edit>Cancel</button><button class="primary-btn" type="submit">Save changes</button></div><p class="form-message" data-asset-edit-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-asset-edit-message]');
  let assetId = '';
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-asset-edit]').forEach((button) => button.addEventListener('click', close));
  const open = (button) => {
    assetId = button.dataset.assetId || '';
    form.elements.name.value = button.dataset.assetName || '';
    form.elements.serial.value = button.dataset.assetSerial === 'Not recorded' ? '' : (button.dataset.assetSerial || '');
    form.elements.installed.value = /^\d{4}-\d{2}-\d{2}$/.test(button.dataset.assetInstalled || '') ? button.dataset.assetInstalled : '';
    form.elements.warrantyThrough.value = /^\d{4}-\d{2}-\d{2}$/.test(button.dataset.assetWarranty || '') ? button.dataset.assetWarranty : '';
    form.elements.status.value = button.dataset.assetStatus === 'Retired' ? 'Retired' : 'Active';
    message.textContent = '';
    dialog.showModal();
    form.elements.name.focus();
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity() || !assetId) return;
    const name = form.elements.name.value.trim();
    if (!name || name.length > 120) { message.textContent = 'Enter an equipment name up to 120 characters.'; return; }
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message.textContent = 'Saving changes…';
    try {
      await repository.updateAsset(assetId, { name, serial: form.elements.serial.value.trim() || 'Not recorded', installed: form.elements.installed.value || 'Date pending', warrantyThrough: form.elements.warrantyThrough.value || '', status: form.elements.status.value });
      message.textContent = 'Equipment record updated.';
      setTimeout(() => { close(); openRecords('assets'); }, 500);
    } catch { message.textContent = 'Could not update equipment. Check the status and warranty date.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-asset-action="edit"]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    open(button);
  }, true);
})();
