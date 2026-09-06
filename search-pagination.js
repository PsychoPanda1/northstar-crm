(() => {
  const boot = () => {
  const repository = window.northstarRepository;
  const drawer = document.querySelector('#record-drawer');
  const list = document.querySelector('#record-list');
  if (!repository?.globalSearchPage || !drawer || !list) return;

  let nextPage = null;
  let loading = false;
  const notify = (value) => { const toast = document.querySelector('#toast'); if (!toast) return; toast.textContent = value; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); };

  const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const groups = {
    Customers: [(item) => `${item.name} · ${item.phone || 'No phone'}`, (item) => item.location || item.status || ''],
    Leads: [(item) => `${item.name} · ${item.service}`, (item) => `${item.status} · ${item.source}`],
    Jobs: [(item) => `${item.customer} · ${item.service}`, (item) => `${item.status} · ${item.time}`],
    Estimates: [(item) => `${item.customer} · ${item.service}`, (item) => `${item.status} · ${item.value}`],
    Invoices: [(item) => `${item.customer} · ${item.value}`, (item) => `${item.status} · Balance ${item.balance ?? 'pending'}`],
    Requests: [(item) => `${item.customer} · ${item.type}`, (item) => `${item.status} · ${item.priority || 'Normal'} · ${item.assignedTo ? `Assigned: ${item.assignedTo}` : 'Unassigned'} · ${item.message}`],
    Messages: [(item) => `${item.customer} · ${item.channel || 'Message'}`, (item) => `${item.status} · ${item.message}`],
    Calls: [(item) => `${item.customer || item.from} · ${item.service || 'Call'}`, (item) => `${item.status} · ${item.note || item.from}`],
    Assets: [(item) => `${item.name} · ${item.customer || 'Customer pending'}`, (item) => `${item.status || 'Active'} · ${item.serial || 'Serial not recorded'}`],
    Plans: [(item) => `${item.customer} · ${item.service}`, (item) => `${item.status} · Renews ${item.renewal || 'not scheduled'}`],
    Materials: [(item) => `${item.name} · ${item.sku || 'No SKU'}${item.barcode ? ` · ${item.barcode}` : ''}`, (item) => item.status || 'Inventory item'],
    'Purchase orders': [(item) => `${item.vendor} · ${item.material || 'Material pending'}`, (item) => `${item.status} · ${item.invoiceNumber || 'Invoice not matched'}`],
    'Fleet vehicles': [(item) => `${item.name} · ${item.licensePlate || 'Plate not recorded'}`, (item) => `${item.makeModel || 'Model not recorded'} · ${item.maintenanceStatus || item.status || 'Vehicle'}`]
  };

  const appendResults = (results) => Object.entries(results || {}).forEach(([label, items]) => {
    const formatters = groups[label];
    if (!formatters || !Array.isArray(items) || !items.length) return;
    const section = [...list.querySelectorAll('.profile-section')].find((node) => node.querySelector('.record-id')?.textContent?.startsWith(label));
    const cards = items.map((item) => `<article class="record-card"><div><span class="record-id">${escape(item.id)}</span><h3>${escape(formatters[0](item))}</h3><p>${escape(formatters[1](item))}</p><div class="record-actions"><button class="ghost-btn" data-global-search="${escape(item.id)}" data-global-search-view="${escape(label)}">Open</button></div></div><span class="record-status">${escape(item.status || '')}</span></article>`).join('');
    if (section) section.insertAdjacentHTML('beforeend', cards);
    else list.insertAdjacentHTML('beforeend', `<div class="profile-section"><span class="record-id">${escape(label)} · ${items.length}</span>${cards}</div>`);
  });

  const removeButton = () => document.querySelector('#global-search-load-more')?.remove();
  const sync = () => {
    if (drawer.dataset.view !== 'global-search' || !nextPage) { removeButton(); return; }
    if (document.querySelector('#global-search-load-more')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'ghost-btn'; button.id = 'global-search-load-more'; button.textContent = 'Load more results';
    button.addEventListener('click', async () => {
      if (loading) return;
      const query = drawer.querySelector('#drawer-title')?.textContent?.replace(/^Search:\s*/i, '').trim();
      if (!query) return;
      loading = true; button.disabled = true; button.textContent = 'Loading…';
      try { const result = await repository.globalSearchPage(query, { page: nextPage.page, pageSize: nextPage.pageSize || 20 }); appendResults(result.results); nextPage = result.pagination?.hasMore ? { page: result.pagination.nextPage, pageSize: result.pagination.pageSize } : null; button.remove(); sync(); }
      catch { button.disabled = false; button.textContent = 'Load more results'; notify('More search results are unavailable.'); }
      finally { loading = false; }
    });
    list.append(button);
  };

  const search = repository.globalSearch.bind(repository);
  repository.globalSearch = async (query) => { const result = await search(query); nextPage = result.pagination?.hasMore ? { page: result.pagination.nextPage, pageSize: result.pagination.pageSize } : null; return result; };
    new MutationObserver(sync).observe(drawer, { attributes: true, childList: true, subtree: true });
  };
  if (window.northstarRepository) boot();
  else {
    const timer = setInterval(() => { if (!window.northstarRepository) return; clearInterval(timer); boot(); }, 50);
    setTimeout(() => clearInterval(timer), 30000);
  }
})();
