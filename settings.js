(() => {
  const link = document.querySelector('a[href="#settings"]');
  if (!link) return;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const openSettings = async (event) => {
    event.preventDefault();
    const repository = window.northstarRepository;
    const drawer = document.querySelector('#record-drawer');
    const title = document.querySelector('#drawer-title');
    const list = document.querySelector('#record-list');
    if (!repository || !drawer || !title || !list) return;
    title.textContent = 'Workspace settings';
    drawer.dataset.view = 'settings';
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    list.innerHTML = '<div class="empty-state">Loading workspace configuration…</div>';
    try {
      const health = repository.remote ? await repository.getIntegrationHealth() : null;
      const workspace = repository.session?.tenant || repository.tenant || {};
      const serviceKey = repository.tenant?.slug || '';
      const origin = window.location.origin;
      const checks = health ? Object.entries(health.checks || {}).map(([key, value]) => `<article class="report-card"><div><span class="record-id">${escapeHtml(key)}</span><h3>${value ? 'Ready' : 'Needs attention'}</h3><p>${value ? 'The current operational check is healthy.' : 'Review deployment configuration before relying on this workflow.'}</p></div></article>`).join('') : '<article class="report-card"><div><span class="record-id">LOCAL PREVIEW</span><h3>Demo adapter active</h3><p>Settings shown here are local preview metadata. Production values are read from the authenticated tenant session.</p></div></article>';
      list.innerHTML = `<div class="report-period">Authenticated tenant configuration · secrets are never displayed</div><article class="report-card"><div><span class="record-id">WORKSPACE</span><h3>${escapeHtml(workspace.businessName || 'Configured workspace')}</h3><p>${escapeHtml(workspace.serviceLabel || 'Service operations')} · ${escapeHtml(workspace.timeZone || 'Timezone configured server-side')}</p></div></article><article class="report-card"><div><span class="record-id">LANDING PAGE HANDOFF</span><h3>Connected service: ${escapeHtml(serviceKey || 'current tenant')}</h3><p>Booking <code>${escapeHtml(origin)}/booking.html?service=${encodeURIComponent(serviceKey)}</code> · Owner portal <code>${escapeHtml(origin)}/portal?service=${encodeURIComponent(serviceKey)}</code></p></div></article><article class="report-card"><div><span class="record-id">PUBLIC INTEGRATION</span><h3>Versioned tenant manifest</h3><p><code>/api/public/tenant?service=${encodeURIComponent(serviceKey)}</code> · availability, catalog, leads, bookings, and owner handoff are tenant-scoped.</p></div></article>${checks}`;
    } catch {
      list.innerHTML = '<div class="empty-state">Workspace settings are unavailable. Check the authenticated session and integration configuration.</div>';
    }
  };
  link.addEventListener('click', openSettings);
})();
