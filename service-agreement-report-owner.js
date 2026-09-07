(function () {
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const show = async (button) => {
    const repository = window.northstarRepository;
    const drawer = document.querySelector('#record-drawer'); const title = document.querySelector('#drawer-title'); const list = document.querySelector('#record-list');
    if (!repository?.getServiceAgreementReport || !drawer || !title || !list) return;
    button.disabled = true;
    try {
      const report = await repository.getServiceAgreementReport(); const summary = report.summary || {};
      title.textContent = 'Service-agreement health'; drawer.dataset.view = 'service-agreements-report'; drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
      const cards = (report.agreements || []).map((item) => `<article class="report-card"><div><span class="record-id">${escapeHtml(item.id)}</span><h3>${escapeHtml(item.customer)} · ${escapeHtml(item.service)}</h3><p>${escapeHtml(item.status)} · ${item.visitsCompleted}/${item.visitsIncluded ?? '—'} visits completed · ${item.visitsRemaining ?? '—'} remaining · Renewal ${item.renewalAt ? escapeHtml(new Date(item.renewalAt).toLocaleDateString()) : 'not scheduled'} · Collected $${Number(item.collected || 0).toFixed(2)}</p></div></article>`).join('');
      const forecast = (report.materialForecast || []).slice(0, 8).map((item) => `<article class="report-card"><div><span class="record-id">MATERIAL FORECAST</span><h3>${escapeHtml(item.name)} · ${Number(item.quantity || 0)}</h3><p>${escapeHtml(item.sku || item.materialId || '')} · Estimated cost $${Number(item.estimatedCost || 0).toFixed(2)} · ${item.jobIds?.length || 0} upcoming job${item.jobIds?.length === 1 ? '' : 's'}</p></div></article>`).join('');
      list.innerHTML = `<div class="report-period">${summary.total || 0} agreements · ${summary.active || 0} active · ${summary.renewingSoon || 0} renewing within 30 days · ${summary.visitsScheduled || 0} scheduled visits · $${Number(summary.collected || 0).toFixed(2)} collected</div>${cards || '<div class="empty-state">No service agreements match this report.</div>'}${forecast ? `<div class="report-period">Upcoming material demand</div>${forecast}` : ''}`;
    } catch { const toast = document.querySelector('#toast'); if (toast) { toast.textContent = 'Service-agreement reporting is unavailable.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); } } finally { button.disabled = false; }
  };
  setTimeout(() => { const reports = document.querySelector('#report-view'); const repository = window.northstarRepository; if (!reports || !repository?.getServiceAgreementReport || document.querySelector('#service-agreements-report-view')) return; const button = document.createElement('button'); button.className = 'ghost-btn'; button.id = 'service-agreements-report-view'; button.textContent = 'Agreement health'; button.hidden = !['owner', 'dispatcher', 'accountant'].includes(repository.session?.owner?.role || repository.session?.role); reports.after(button); button.addEventListener('click', () => show(button)); }, 1800);
}());
