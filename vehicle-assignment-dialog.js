(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#vehicle-assignment-dialog')) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'vehicle-assignment-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-vehicle-assignment aria-label="Close">×</button><div class="dialog-kicker">DISPATCH FLEET</div><h2>Assign a vehicle</h2><p>Choose an active fleet vehicle for this job. Schedule and lifecycle checks remain authoritative on the server.</p><form><p class="profile-section" data-assignment-job>Job</p><label>Active vehicle<select name="vehicleId" required><option value="">Loading vehicles…</option></select></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-vehicle-assignment>Cancel</button><button class="primary-btn" type="submit">Assign vehicle</button></div><p class="form-message" data-assignment-message role="status" aria-live="polite"></p></form></dialog>';
  document.body.append(dialog);

  const form = dialog.querySelector('form');
  const vehicleInput = form.elements.vehicleId;
  const jobLabel = dialog.querySelector('[data-assignment-job]');
  const message = dialog.querySelector('[data-assignment-message]');
  let jobId = '';
  let vehicles = [];
  const close = () => { if (dialog.open) dialog.close(); };
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  dialog.querySelectorAll('[data-close-vehicle-assignment]').forEach((button) => button.addEventListener('click', close));

  const open = async (button) => {
    jobId = button.dataset.vehicleAssign;
    jobLabel.textContent = `Job ${jobId}`;
    message.textContent = 'Loading active vehicles…';
    try {
      const result = await repository.listVehicles();
      vehicles = (result.items || result || []).filter((item) => item.status === 'Active');
      vehicleInput.innerHTML = vehicles.length ? `<option value="">Choose a vehicle</option>${vehicles.map((item) => `<option value="${escape(item.id)}">${escape(item.name)} · ${escape(item.makeModel || 'Fleet vehicle')} · ${escape(item.licensePlate || 'Plate pending')}</option>`).join('')}` : '<option value="">No active vehicles</option>';
      message.textContent = vehicles.length ? '' : 'Add or reactivate a vehicle before assigning fleet capacity.';
      dialog.showModal();
      if (vehicles.length) vehicleInput.focus();
    } catch { message.textContent = 'Could not load active vehicles.'; dialog.showModal(); }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity() || !jobId || !vehicleInput.value) return;
    const vehicle = vehicles.find((item) => item.id === vehicleInput.value);
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    message.textContent = 'Assigning vehicle…';
    try {
      await repository.assignJobVehicle(jobId, vehicleInput.value);
      message.textContent = `${vehicle?.name || 'Vehicle'} assigned to the job.`;
      setTimeout(close, 500);
      setTimeout(() => document.querySelector('#drawer-refresh')?.click(), 550);
    } catch {
      message.textContent = 'Could not assign this vehicle. Check lifecycle and schedule conflicts.';
      submit.disabled = false;
    }
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-vehicle-assign]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void open(button);
  }, true);
})();
