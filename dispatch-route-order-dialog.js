(() => {
  const list = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!list || !repository?.getRouteManifest || !repository?.updateRouteOrder || document.querySelector('#dispatch-route-order-dialog')) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'dispatch-route-order-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-route-order aria-label="Close">×</button><div class="dialog-kicker">DISPATCH ROUTING</div><h2>Arrange route stops</h2><p>Load one technician route, then assign each stop a unique driving position. Appointment windows remain server-validated when the order is saved.</p><form><label>Date<input name="date" type="date" required /></label><label>Technician<input name="technician" maxlength="100" required placeholder="Technician name" /></label><div class="route-stop-list" data-route-stops aria-live="polite"><p class="muted">Load a route to arrange its stops.</p></div><div class="workflow-actions"><button class="ghost-btn" type="button" data-load-route>Load route</button><button class="ghost-btn" type="button" data-close-route-order>Cancel</button><button class="primary-btn" type="submit" disabled>Save order</button></div><p class="form-message" data-route-order-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);

  const form = dialog.querySelector('form');
  const stops = dialog.querySelector('[data-route-stops]');
  const message = dialog.querySelector('[data-route-order-message]');
  const loadButton = dialog.querySelector('[data-load-route]');
  const saveButton = form.querySelector('[type="submit"]');
  let activeButton;
  let manifest = null;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const tomorrow = () => { const date = new Date(Date.now() + 86400000); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
  const renderStops = (items) => {
    stops.innerHTML = items.length ? items.map((stop, index) => `<label class="route-stop-row"><span><strong>${escape(stop.customer || 'Customer pending')}</strong><small>${escape(stop.service || 'Service')} · ${escape(stop.location || 'Address pending')}</small></span><span>Position<input type="number" min="1" max="${items.length}" value="${Number(stop.sequence || index + 1)}" data-route-position="${escape(stop.id)}" required /></span></label>`).join('') : '<p class="muted">No stops were found for this technician and date.</p>';
    saveButton.disabled = !items.length;
  };
  const load = async () => {
    if (!form.reportValidity()) return;
    loadButton.disabled = true; saveButton.disabled = true; message.textContent = 'Loading route stops…'; manifest = null;
    try {
      manifest = await repository.getRouteManifest(form.elements.date.value, form.elements.technician.value.trim());
      const items = Array.isArray(manifest.stops) ? manifest.stops : [];
      renderStops(items);
      message.textContent = items.length ? `${items.length} stop${items.length === 1 ? '' : 's'} loaded. Assign a unique position to every stop.` : 'No stops found for this route.';
    } catch { stops.innerHTML = '<p class="muted">Route stops could not be loaded.</p>'; message.textContent = 'Could not load this route. Check the date, technician, and session.'; }
    finally { loadButton.disabled = false; }
  };
  const open = (button) => { activeButton = button; form.reset(); form.elements.date.value = tomorrow(); stops.innerHTML = '<p class="muted">Load a route to arrange its stops.</p>'; message.textContent = ''; manifest = null; saveButton.disabled = true; dialog.showModal(); form.elements.date.focus(); };
  dialog.querySelectorAll('[data-close-route-order]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  loadButton.addEventListener('click', () => void load());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const items = Array.isArray(manifest?.stops) ? manifest.stops : [];
    const positions = [...stops.querySelectorAll('[data-route-position]')].map((input) => Number(input.value));
    if (!items.length || positions.length !== items.length || positions.some((value) => !Number.isInteger(value) || value < 1 || value > items.length) || new Set(positions).size !== positions.length) { message.textContent = `Enter each position once from 1 through ${items.length || 1}.`; return; }
    const ordered = items.map((stop, index) => ({ id: stop.id, position: positions[index] })).sort((a, b) => a.position - b.position).map((stop) => stop.id);
    saveButton.disabled = true; loadButton.disabled = true; if (activeButton) activeButton.disabled = true; message.textContent = 'Saving route order…';
    try { await repository.updateRouteOrder(form.elements.date.value, form.elements.technician.value.trim(), ordered, crypto.randomUUID()); dialog.close(); showToast('Route order updated.'); document.querySelector('#drawer-refresh')?.click(); }
    catch { message.textContent = 'Could not update route order. Check appointment windows and technician access.'; saveButton.disabled = false; loadButton.disabled = false; if (activeButton) activeButton.disabled = false; }
  });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-route-order]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); open(button); }, true);
})();
