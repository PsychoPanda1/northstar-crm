(() => {
  const start = () => {
    const repository = window.northstarRepository;
    const anchor = document.querySelector('#operations-metrics-view') || document.querySelector('#report-view');
    const drawer = document.querySelector('#record-drawer');
    const title = document.querySelector('#drawer-title');
    const list = document.querySelector('#record-list');
    if (!repository || !anchor || !drawer || !title || !list) return false;
    if (document.querySelector('#release-readiness-view')) return true;
    const button = document.createElement('button');
    button.className = 'ghost-btn';
    button.id = 'release-readiness-view';
    button.textContent = 'Release readiness';
    button.hidden = !['owner', 'accountant'].includes(repository.session?.owner?.role || 'owner');
    anchor.after(button);
    const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const readiness = await repository.getReadiness();
        const checks = Object.entries(readiness.checks || {}).map(([key, value]) => `<article class="report-card"><div><span class="record-id">${escape(key)}</span><h3>${value ? 'Ready' : 'Needs attention'}</h3><p>${value ? 'This deployment check is passing.' : 'Resolve this configuration or persistence check before production use.'}</p></div></article>`).join('');
        drawer.dataset.view = 'release-readiness';
        title.textContent = 'Release readiness';
        document.querySelector('#record-search').value = '';
        list.innerHTML = `<div class="report-period">${readiness.ok ? 'READY' : 'NOT READY'} · checked ${escape(new Date().toLocaleString())}</div>${checks || '<div class="empty-state">No readiness checks were returned.</div>'}`;
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
      } catch {
        const toast = document.querySelector('#toast');
        if (toast) { toast.textContent = 'Release readiness is unavailable.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); }
      } finally { button.disabled = false; }
    });
    return true;
  };
  if (!start()) { const timer = setInterval(() => { if (start()) clearInterval(timer); }, 100); setTimeout(() => clearInterval(timer), 15000); }
})();
