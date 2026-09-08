(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#vehicle-maintenance-dialog')) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'vehicle-maintenance-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-vehicle-maintenance aria-label="Close">×</button><div class="dialog-kicker">FLEET OPERATIONS</div><h2 id="vehicle-maintenance-title">Set service due</h2><p id="vehicle-maintenance-help">Keep preventive maintenance and odometer records current for this vehicle.</p><form><p class="profile-section" data-maintenance-vehicle>Vehicle</p><label>Next service due<input name="nextServiceDue" type="date" /></label><p class="form-hint">Leave the date blank to clear the current service-due date.</p><label>Current odometer miles<input name="odometer" type="number" min="0" step="1" inputmode="numeric" placeholder="Optional" /></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-vehicle-maintenance>Cancel</button><button class="primary-btn" type="submit">Save maintenance</button></div><p class="form-message" data-maintenance-message role="status" aria-live="polite"></p></form></dialog>';
  document.body.append(dialog);

  const form = dialog.querySelector('form');
  const dateInput = form.elements.nextServiceDue;
  const odometerInput = form.elements.odometer;
  const vehicleLabel = dialog.querySelector('[data-maintenance-vehicle]');
  const message = dialog.querySelector('[data-maintenance-message]');
  let vehicleId = '';

  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-vehicle-maintenance]').forEach((button) => button.addEventListener('click', close));

  const open = async (button) => {
    vehicleId = button.dataset.vehicleMaintenance;
    form.reset();
    vehicleLabel.textContent = `Vehicle ${vehicleId}`;
    message.textContent = 'Loading current maintenance details…';
    try {
      const vehicles = await repository.listVehicles();
      const vehicle = (vehicles.items || vehicles || []).find((item) => item.id === vehicleId);
      vehicleLabel.textContent = `${vehicle?.name || vehicleId} · ${vehicle?.makeModel || 'Fleet vehicle'}`;
      dateInput.value = vehicle?.nextServiceDue ? String(vehicle.nextServiceDue).slice(0, 10) : '';
      odometerInput.value = Number.isInteger(vehicle?.odometer) ? String(vehicle.odometer) : '';
      message.textContent = '';
      dialog.showModal();
      dateInput.focus();
    } catch {
      message.textContent = 'Could not load vehicle maintenance details.';
      dialog.showModal();
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity() || !vehicleId) return;
    const odometer = odometerInput.value.trim() ? Number(odometerInput.value) : null;
    if (odometer !== null && (!Number.isInteger(odometer) || odometer < 0)) { message.textContent = 'Enter a non-negative whole-number odometer value.'; return; }
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    message.textContent = 'Saving maintenance details…';
    try {
      await repository.updateVehicleMaintenance(vehicleId, dateInput.value.trim(), odometer, crypto.randomUUID());
      message.textContent = 'Vehicle maintenance schedule updated.';
      setTimeout(close, 500);
      setTimeout(() => document.querySelector('#drawer-refresh')?.click(), 550);
    } catch {
      message.textContent = 'Could not update maintenance. Check the date and odometer value.';
      submit.disabled = false;
    }
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-vehicle-maintenance]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void open(button);
  }, true);
})();
