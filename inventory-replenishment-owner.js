(() => {
  const drawerElement = document.querySelector('#record-drawer');
  const list = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!drawerElement || !list || !repository?.getInventoryReplenishment || !repository?.createReplenishmentOrders) return;
  const decorate = () => {
    if (drawerElement.dataset.view !== 'inventory-replenishment' || list.querySelector('[data-replenishment-order]')) return;
    const actions = document.createElement('div');
    actions.className = 'record-actions';
    actions.style.marginBottom = '12px';
    actions.innerHTML = '<button type="button" class="ghost-btn" data-replenishment-order>Create recommended purchase orders</button>';
    list.prepend(actions);
  };
  const observer = new MutationObserver(decorate);
  observer.observe(list, { childList: true, subtree: true });
  observer.observe(drawerElement, { attributes: true, attributeFilter: ['data-view'] });
  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-replenishment-order]');
    if (!button) return;
    const vendor = window.prompt('Vendor for the recommended purchase orders', 'Local supply house');
    if (!vendor?.trim()) return;
    button.disabled = true;
    try {
      const plan = await repository.getInventoryReplenishment();
      const materialIds = (plan.items || []).filter((item) => Number(item.recommendedPurchaseQuantity) > 0).map((item) => item.materialId);
      if (!materialIds.length) { showToast('No recommended orders are available.'); return; }
      const result = await repository.createReplenishmentOrders(materialIds, vendor.trim());
      showToast(`${result.orders?.length || 0} purchase order${result.orders?.length === 1 ? '' : 's'} created and awaiting approval.`);
      openRecords('purchase-orders');
    } catch (error) { showToast(error.message === 'no_replenishment_orders_available' ? 'No recommended orders are available.' : 'Could not create replenishment orders.'); } finally { button.disabled = false; }
  });
  decorate();
})();
