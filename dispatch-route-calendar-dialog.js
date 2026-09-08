(() => {
  const repository = window.northstarRepository;
  if (!repository?.downloadRouteCalendar || document.querySelector('#dispatch-route-calendar-dialog')) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'dispatch-route-calendar-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-route-calendar aria-label="Close">×</button><div class="dialog-kicker">DISPATCH EXPORT</div><h2>Export route calendar</h2><p>Download an iCalendar file for one technician or the complete tenant route manifest.</p><form><label>Date<input name="date" type="date" required /></label><label>Technician<select name="technician"><option value="">All technicians</option></select></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-route-calendar>Cancel</button><button class="primary-btn" type="submit">Download calendar</button></div><p class="form-message" data-route-calendar-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);

  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-route-calendar-message]');
  let activeButton;
  const today = () => new Intl.DateTimeFormat('en-CA').format(new Date());
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const open = async (button) => {
    activeButton = button; form.reset(); form.elements.date.value = today(); message.textContent = 'Loading technician roster…';
    try {
      const members = (await repository.list('team')).filter((item) => ['Lead technician', 'Field technician', 'Apprentice'].includes(item.role));
      const currentTechnician = repository.session?.owner?.name || '';
      const options = members.map((item) => `<option value="${escape(item.name)}">${escape(item.name)} · ${escape(item.role || 'Field technician')}</option>`).join('');
      form.elements.technician.innerHTML = `<option value="">All technicians</option>${options}`;
      if (currentTechnician && repository.session?.owner?.role === 'technician') form.elements.technician.value = currentTechnician;
      message.textContent = '';
    } catch { message.textContent = 'Technician filtering is unavailable; all routes can still be exported.'; }
    dialog.showModal(); form.elements.date.focus();
  };
  dialog.querySelectorAll('[data-close-route-calendar]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; if (activeButton) activeButton.disabled = true; message.textContent = 'Preparing calendar file…';
    try {
      const result = await repository.downloadRouteCalendar(form.elements.date.value, form.elements.technician.value.trim());
      const url = URL.createObjectURL(result.blob); const link = document.createElement('a'); link.href = url; link.download = result.filename; link.click(); URL.revokeObjectURL(url);
      dialog.close(); showToast('Route calendar downloaded.');
    } catch { message.textContent = 'Could not export the route calendar. Confirm the date, technician, and session.'; submit.disabled = false; if (activeButton) activeButton.disabled = false; }
  });
  document.addEventListener('click', (event) => { const button = event.target.closest('#dispatch-route-calendar, [data-route-calendar]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); void open(button); }, true);
})();
