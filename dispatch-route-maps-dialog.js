(() => {
  const list = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!list || !repository?.getRouteManifest || document.querySelector('#dispatch-route-maps-dialog')) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'dispatch-route-maps-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-route-maps aria-label="Close">×</button><div class="dialog-kicker">DISPATCH NAVIGATION</div><h2>Open route in Maps</h2><p>Choose a date and optional technician. Northstar will preserve the current ordered stops when handing the route to Google Maps.</p><form><label>Date<input name="date" type="date" required /></label><label>Technician<select name="technician"><option value="">All technicians</option></select></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-route-maps>Cancel</button><button class="primary-btn" type="submit">Open Maps</button></div><p class="form-message" data-route-maps-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);

  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-route-maps-message]');
  let activeButton;
  const today = () => new Intl.DateTimeFormat('en-CA').format(new Date());
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const open = async (button) => {
    activeButton = button; form.reset(); form.elements.date.value = today(); message.textContent = 'Loading technician roster…';
    try {
      const members = (await repository.list('team')).filter((item) => ['Lead technician', 'Field technician', 'Apprentice'].includes(item.role));
      form.elements.technician.innerHTML = `<option value="">All technicians</option>${members.map((item) => `<option value="${escape(item.name)}">${escape(item.name)} · ${escape(item.role || 'Field technician')}</option>`).join('')}`;
      message.textContent = '';
    } catch { message.textContent = 'Technician filtering is unavailable; all routes can still be loaded.'; }
    dialog.showModal(); form.elements.date.focus();
  };
  dialog.querySelectorAll('[data-close-route-maps]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const date = form.elements.date.value;
    const technician = form.elements.technician.value.trim();
    const mapWindow = window.open('about:blank', '_blank');
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; if (activeButton) activeButton.disabled = true; message.textContent = 'Loading ordered route stops…';
    try {
      const manifest = await repository.getRouteManifest(date, technician);
      const stops = (manifest.stops || []).filter((stop) => String(stop.location || '').trim() && String(stop.location).trim().toLowerCase() !== 'address pending');
      if (!stops.length) throw new Error('route addresses unavailable');
      const params = new URLSearchParams({ api: '1', origin: stops[0].location, destination: stops[stops.length - 1].location, travelmode: 'driving' });
      if (stops.length > 2) params.set('waypoints', stops.slice(1, -1).map((stop) => stop.location).join('|'));
      const mapsUrl = `https://www.google.com/maps/dir/?${params.toString()}`;
      if (mapWindow && !mapWindow.closed) { mapWindow.opener = null; mapWindow.location.href = mapsUrl; } else window.open(mapsUrl, '_blank', 'noopener,noreferrer');
      dialog.close(); showToast(`${stops.length} ordered stop${stops.length === 1 ? '' : 's'} opened in Maps.`);
    } catch { if (mapWindow && !mapWindow.closed) mapWindow.close(); message.textContent = 'Could not open this route. Confirm the date, technician, and mapped service addresses.'; submit.disabled = false; if (activeButton) activeButton.disabled = false; }
  });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-route-maps]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); void open(button); }, true);
})();
