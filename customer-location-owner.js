(() => {
  const recordList = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!recordList || !repository) return;

  let dialog;
  let customerId = '';
  const message = (text) => { const node = dialog?.querySelector('[data-location-message]'); if (node) node.textContent = text; };
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'workflow-dialog';
    dialog.id = 'customer-location-dialog';
    dialog.innerHTML = '<button class="dialog-close" type="button" data-close-location aria-label="Close">×</button><div class="dialog-kicker">SERVICE LOCATIONS</div><h2>Add service location</h2><p>Save a routable address for this customer so dispatch, repeat bookings, and field history stay connected.</p><form><label>Location label<input name="label" type="text" maxlength="80" required placeholder="Primary home" /></label><label>Service address<textarea name="address" rows="3" maxlength="180" required placeholder="Street, city, state, ZIP"></textarea></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-location>Cancel</button><button class="primary-btn" type="submit">Save location</button></div><p class="form-message" data-location-message role="status" aria-live="polite"></p></form>';
    document.body.append(dialog);
    dialog.querySelectorAll('[data-close-location]').forEach((button) => button.addEventListener('click', () => dialog.close()));
    dialog.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const label = form.elements.label.value.trim();
      const address = form.elements.address.value.trim();
      if (!customerId || label.length < 2 || label.length > 80 || address.length < 5 || address.length > 180) { message('Enter a label of 2–80 characters and an address of 5–180 characters.'); return; }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      message('Saving…');
      try {
        await repository.createLocation(customerId, label, address, crypto.randomUUID());
        message('Service location saved.');
        setTimeout(() => { dialog.close(); document.querySelector('[data-view="customers"]')?.click(); }, 450);
      } catch { message('Could not save the service location. Check the address and your role.'); }
      finally { submit.disabled = false; }
    });
    return dialog;
  };

  recordList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-location-action="add"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    customerId = button.dataset.customerId || '';
    const modal = ensureDialog();
    const form = modal.querySelector('form');
    form.reset();
    form.elements.label.value = 'Service address';
    message('');
    modal.showModal();
    form.elements.label.focus();
  }, true);
})();
