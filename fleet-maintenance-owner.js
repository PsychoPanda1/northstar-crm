(() => {
  const list = document.querySelector('#record-list');
  const drawer = document.querySelector('#record-drawer');
  if (!list || !drawer) return;
  const decorate = () => {
    if (drawer.dataset.view !== 'vehicles') return;
    list.querySelectorAll('.record-card').forEach((card) => {
      if (card.querySelector('[data-vehicle-maintenance]')) return;
      const id = card.querySelector('.record-id')?.textContent?.trim();
      if (!id || !/^VEH-/.test(id)) return;
      const actions = card.querySelector('.record-actions') || (() => { const node = document.createElement('div'); node.className = 'record-actions'; card.append(node); return node; })();
      const button = document.createElement('button');
      button.className = 'ghost-btn';
      button.dataset.vehicleMaintenance = id;
      button.textContent = 'Set service due';
      actions.append(button);
    });
  };
  new MutationObserver(decorate).observe(list, { childList: true, subtree: true });
  new MutationObserver(decorate).observe(drawer, { attributes: true, attributeFilter: ['data-view'] });
  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-vehicle-maintenance]');
    if (!button) return;
    const nextServiceDue = window.prompt('Next vehicle service date (YYYY-MM-DD); leave blank to clear', '');
    if (nextServiceDue === null) return;
    const odometerInput = window.prompt('Current odometer miles (optional)', '');
    const odometer = odometerInput?.trim() ? Number(odometerInput) : null;
    if (odometer !== null && (!Number.isInteger(odometer) || odometer < 0)) { showToast('Enter a non-negative whole-number odometer value.'); return; }
    button.disabled = true;
    try { await repository.updateVehicleMaintenance(button.dataset.vehicleMaintenance, nextServiceDue.trim(), odometer, crypto.randomUUID()); showToast('Vehicle maintenance schedule updated.'); openRecords('vehicles'); }
    catch { showToast('Could not update vehicle maintenance. Use YYYY-MM-DD and a valid odometer value.'); button.disabled = false; }
  });
})();
