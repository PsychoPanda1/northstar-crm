(() => {
  const list = document.querySelector('#record-list');
  const drawer = document.querySelector('#record-drawer');
  if (!list || !drawer) return;
  const start = () => {
    const repository = window.northstarRepository;
    if (!repository?.retryInventory) { window.setTimeout(start, 100); return; }
    const decorate = () => {
      if (drawer.dataset.view !== 'inventory-transactions') return;
      list.querySelectorAll('.record-card').forEach((card) => {
        if (card.querySelector('[data-inventory-provider-retry]') || !/Failed|Retry scheduled/.test(card.textContent || '')) return;
        const id = card.querySelector('.record-id')?.textContent?.trim(); if (!id || !/^INVTX-/.test(id)) return;
        const actions = card.querySelector('.record-actions') || (() => { const node = document.createElement('div'); node.className = 'record-actions'; card.querySelector('div')?.append(node); return node; })();
        const button = document.createElement('button'); button.type = 'button'; button.className = 'ghost-btn'; button.dataset.inventoryProviderRetry = id; button.textContent = 'Retry provider sync';
        button.addEventListener('click', async () => { button.disabled = true; try { await repository.retryInventory(id); if (typeof showToast === 'function') showToast('Inventory provider sync requeued.'); document.querySelector('[data-view="inventory-transactions"]')?.click(); } catch { if (typeof showToast === 'function') showToast('Could not requeue inventory provider sync.'); button.disabled = false; } });
        actions.append(button);
      });
    };
    new MutationObserver(decorate).observe(list, { childList: true, subtree: true });
    new MutationObserver(decorate).observe(drawer, { attributes: true, attributeFilter: ['data-view'] });
    decorate();
  };
  start();
})();
