(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#call-booking-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'call-booking-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-call-booking aria-label="Close">×</button><div class="dialog-kicker">CALL TO JOB</div><h2>Book inbound call</h2><p>Turn the caller’s request into a dispatchable job with the service details and priority captured in one auditable step.</p><form><label>Appointment time<input name="time" maxlength="120" placeholder="Tomorrow 9:00 AM" required /></label><label>Service requested<input name="service" maxlength="120" required /></label><label>Service address<input name="location" autocomplete="street-address" maxlength="240" required /></label><label>Priority<select name="priority"><option>Low</option><option selected>Normal</option><option>High</option><option>Emergency</option></select></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-call-booking>Cancel</button><button class="primary-btn" type="submit">Book job</button></div><p class="form-message" data-call-booking-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-call-booking-message]');
  let callId = '';
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-call-booking]').forEach((button) => button.addEventListener('click', close));
  const open = (id) => { callId = id; form.reset(); form.elements.time.value = 'Tomorrow 9:00 AM'; form.elements.service.value = 'Service visit'; form.elements.location.value = 'Address pending'; message.textContent = ''; dialog.showModal(); form.elements.time.focus(); };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true; message.textContent = 'Booking…';
    try {
      await repository.bookCall(callId, { time: values.time.trim(), service: values.service.trim(), location: values.location.trim(), priority: values.priority }, crypto.randomUUID());
      message.textContent = 'Job booked.';
      setTimeout(() => { close(); document.querySelector('[data-view="dispatch"]')?.click(); }, 350);
    } catch { message.textContent = 'Could not book this call. Check the time and customer details.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-call-action="book"]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    open(button.dataset.callId);
  }, true);
})();
