(() => {
  const list = document.querySelector('#record-list');
  const drawer = document.querySelector('#record-drawer');
  const toolbar = document.querySelector('.drawer-toolbar');
  if (!list || !drawer || !toolbar) return;
  const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const refresh = async () => {
    if (drawer.dataset.view !== 'vehicles') return;
    try {
      const locations = await repository.listVehicleLocations();
      const byId = new Map((locations.items || []).map((item) => [item.vehicleId, item]));
      list.querySelectorAll('.record-card').forEach((card) => {
        if (card.querySelector('[data-fleet-location]')) return;
        const vehicleId = card.querySelector('.record-id')?.textContent?.trim();
        const item = byId.get(vehicleId);
        if (!item) return;
        const detail = document.createElement('small');
        detail.dataset.fleetLocation = vehicleId;
        detail.style.cssText = 'display:block;color:#71827d;margin-top:8px';
        detail.innerHTML = `GPS: ${escape(item.status)}${item.location ? ` · ${escape(new Date(item.location.recordedAt).toLocaleString())} <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.location.latitude},${item.location.longitude}`)}" target="_blank" rel="noopener">Open map</a>` : ''}`;
        card.append(detail);
      });
    } catch {}
  };
  const button = document.createElement('button');
  button.className = 'ghost-btn';
  button.id = 'fleet-location-refresh';
  button.textContent = 'Refresh GPS';
  button.hidden = true;
  toolbar.prepend(button);
  const sync = () => { button.hidden = drawer.dataset.view !== 'vehicles'; if (drawer.dataset.view === 'vehicles') refresh(); };
  button.addEventListener('click', refresh);
  new MutationObserver(sync).observe(drawer, { attributes: true, attributeFilter: ['data-view'] });
  new MutationObserver(() => { if (drawer.dataset.view === 'vehicles') refresh(); }).observe(list, { childList: true, subtree: true });
})();
