(() => {
  const list = document.querySelector('#record-list');
  const drawer = document.querySelector('#record-drawer');
  if (!list || !drawer) return;
  const decorate = () => {
    if (drawer.dataset.view !== 'materials') return;
    list.querySelectorAll('.record-card').forEach((card) => {
      if (card.querySelector('[data-material-action="count"]')) return;
      const id = card.querySelector('.record-id')?.textContent?.trim();
      if (!id || !/^MAT-/.test(id)) return;
      const actions = card.querySelector('.record-actions') || (() => { const node = document.createElement('div'); node.className = 'record-actions'; card.append(node); return node; })();
      const button = document.createElement('button');
      button.className = 'ghost-btn';
      button.dataset.materialAction = 'count';
      button.dataset.materialId = id;
      button.textContent = 'Cycle count';
      actions.append(button);
    });
  };
  new MutationObserver(decorate).observe(list, { childList: true, subtree: true });
  new MutationObserver(decorate).observe(drawer, { attributes: true, attributeFilter: ['data-view'] });
  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-material-action="count"]');
    if (!button) return;
    const locationId = window.prompt('Inventory location ID', 'main');
    if (!locationId?.trim()) return;
    const countedQuantity = Number(window.prompt('Physical quantity counted', '0'));
    const reason = window.prompt('Reason for this count', 'Cycle count reconciliation');
    if (!Number.isInteger(countedQuantity) || countedQuantity < 0 || !reason?.trim()) { showToast('Enter a non-negative whole-number count and a reason.'); return; }
    button.disabled = true;
    try { await repository.adjustInventory(button.dataset.materialId, locationId.trim(), countedQuantity, reason.trim(), crypto.randomUUID()); showToast('Inventory count reconciled and audited.'); openRecords('materials'); }
    catch { showToast('Could not reconcile this count. Check the material, location, and reason.'); button.disabled = false; }
  });
})();
