(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#vehicle-status-dialog')) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'vehicle-status-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-vehicle-status aria-label="Close">×</button><div class="dialog-kicker">FLEET OPERATIONS</div><h2>Update vehicle status</h2><p>Keep dispatch availability accurate across active, maintenance, and retired vehicles.</p><form><p class="profile-section" data-vehicle-label>Vehicle</p><label>Status<select name="status" required><option>Active</option><option>Maintenance</option><option>Retired</option></select></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-vehicle-status>Cancel</button><button class="primary-btn" type="submit">Save status</button></div><p class="form-message" data-vehicle-status-message role="status" aria-live="polite"></p></form></dialog>';
  document.body.append(dialog);

  const form = dialog.querySelector('form');
  const statusInput = form.elements.status;
  const message = dialog.querySelector('[data-vehicle-status-message]');
  const label = dialog.querySelector('[data-vehicle-label]');
  let vehicleId = '';

  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-vehicle-status]').forEach((button) => button.addEventListener('click', close));

  const open = async (button) => {
    vehicleId = button.dataset.vehicleStatus;
    message.textContent = 'Loading vehicle details…';
    label.textContent = `Vehicle ${vehicleId}`;
    try {
      const vehicles = await repository.listVehicles();
      const vehicle = (vehicles.items || vehicles || []).find((item) => item.id === vehicleId);
      statusInput.value = ['Active', 'Maintenance', 'Retired'].includes(vehicle?.status) ? vehicle.status : 'Active';
      label.textContent = `${vehicle?.name || vehicleId} · ${vehicle?.makeModel || 'Fleet vehicle'}`;
      message.textContent = '';
      dialog.showModal();
      statusInput.focus();
    } catch {
      message.textContent = 'Could not load vehicle details.';
      dialog.showModal();
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity() || !vehicleId) return;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    message.textContent = 'Saving vehicle status…';
    try {
      await repository.updateVehicleStatus(vehicleId, statusInput.value);
      message.textContent = `Vehicle marked ${statusInput.value}.`;
      setTimeout(close, 500);
      setTimeout(() => document.querySelector('#drawer-refresh')?.click(), 550);
    } catch {
      message.textContent = 'Could not update vehicle status. Confirm your fleet permissions.';
      submit.disabled = false;
    }
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-vehicle-status]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void open(button);
  }, true);
})();
