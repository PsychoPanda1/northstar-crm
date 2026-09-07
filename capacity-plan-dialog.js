(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#dispatch-capacity-dialog')) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'dispatch-capacity-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-capacity aria-label="Close">×</button><div class="dialog-kicker">DISPATCH PLANNING</div><h2>Set technician capacity</h2><p>Compare planned minutes with a technician target before you assign more work.</p><form><label>Date<input name="date" type="date" required /></label><label>Technician<select name="technician" required><option value="">Loading technicians…</option></select></label><div class="profile-section" data-capacity-summary>Choose a date and technician to see planned workload.</div><label>Target minutes<input name="targetMinutes" type="number" min="30" max="1440" step="30" value="480" required /></label><p class="form-hint">Use 30–1,440 minutes. This target is planning guidance; appointment conflicts and skills remain server-enforced.</p><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-capacity>Cancel</button><button class="primary-btn" type="submit">Save capacity</button></div><p class="form-message" data-capacity-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);

  const form = dialog.querySelector('form');
  const dateInput = form.elements.date;
  const technicianInput = form.elements.technician;
  const targetInput = form.elements.targetMinutes;
  const summary = dialog.querySelector('[data-capacity-summary]');
  const message = dialog.querySelector('[data-capacity-message]');
  let loadingSummary = false;

  const today = () => new Intl.DateTimeFormat('en-CA').format(new Date());
  const close = () => { if (dialog.open) dialog.close(); };
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const eligible = (items) => (items || []).filter((item) => ['Lead technician', 'Field technician', 'Apprentice'].includes(item.role));

  dialog.querySelectorAll('[data-close-capacity]').forEach((button) => button.addEventListener('click', close));

  const loadSummary = async () => {
    if (!dateInput.value || !technicianInput.value || loadingSummary) return;
    loadingSummary = true;
    summary.textContent = 'Loading planned workload…';
    try {
      const capacity = await repository.getDispatchCapacity(dateInput.value, technicianInput.value);
      summary.innerHTML = `<strong>${escape(technicianInput.value)}</strong><br>${Number(capacity.plannedMinutes || 0)} planned minutes · ${capacity.targetMinutes ? `${Number(capacity.targetMinutes)} target minutes · ${Number(capacity.utilizationPercent || 0)}% utilized` : 'No target saved yet'}`;
      if (capacity.targetMinutes) targetInput.value = String(capacity.targetMinutes);
    } catch {
      summary.textContent = 'Could not load this technician’s planned workload.';
    } finally {
      loadingSummary = false;
    }
  };

  const open = async () => {
    form.reset();
    dateInput.value = today();
    targetInput.value = '480';
    message.textContent = 'Loading technicians…';
    summary.textContent = 'Choose a date and technician to see planned workload.';
    try {
      const members = eligible(await repository.list('team'));
      technicianInput.innerHTML = members.length ? `<option value="">Choose a technician</option>${members.map((item) => `<option value="${escape(item.name)}">${escape(item.name)} · ${escape(item.role || 'Field technician')}</option>`).join('')}` : '<option value="">No eligible technicians</option>';
      message.textContent = members.length ? '' : 'Add an eligible field technician before setting capacity.';
      dialog.showModal();
      if (members.length) technicianInput.focus();
    } catch {
      message.textContent = 'Could not load the technician roster.';
      dialog.showModal();
    }
  };

  dateInput.addEventListener('change', () => { void loadSummary(); });
  technicianInput.addEventListener('change', () => { void loadSummary(); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const date = dateInput.value.trim();
    const technician = technicianInput.value.trim();
    const targetMinutes = Number(targetInput.value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !technician || !Number.isInteger(targetMinutes) || targetMinutes < 30 || targetMinutes > 1440) {
      message.textContent = 'Choose a date, technician, and target from 30 to 1,440 minutes.';
      return;
    }
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    message.textContent = 'Saving capacity target…';
    try {
      await repository.setDispatchCapacity(date, technician, targetMinutes);
      message.textContent = `Capacity target saved for ${technician}.`;
      setTimeout(close, 500);
    } catch {
      message.textContent = 'Could not save capacity. Confirm the date and technician.';
      submit.disabled = false;
    }
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('#dispatch-capacity-view');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void open();
  }, true);
})();
