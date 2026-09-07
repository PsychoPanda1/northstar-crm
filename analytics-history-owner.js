(() => {
  const start = () => {
    const reportButton = document.querySelector('#report-view');
    const repository = window.northstarRepository;
    if (!reportButton || !repository?.getAnalyticsHistory || !repository?.captureAnalyticsSnapshot) return false;
    if (document.querySelector('#analytics-history-view')) return true;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'analytics-history-view';
    button.className = 'ghost-btn';
    button.textContent = 'KPI history';
    reportButton.after(button);
    const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
    const notify = (message) => { const toast = document.querySelector('#toast'); if (!toast) return; toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); };
    const render = (history) => {
      const drawer = document.querySelector('#record-drawer');
      const title = document.querySelector('#drawer-title');
      const list = document.querySelector('#record-list');
      if (!drawer || !title || !list) return;
      const labels = ['Cash collected', 'Gross margin', 'New leads', 'Scheduled jobs', 'Lead conversion', 'Estimate close rate'];
      const snapshots = history.snapshots || [];
      drawer.dataset.view = 'analytics-history';
      title.textContent = 'KPI history';
      document.querySelector('#record-search').value = '';
      list.innerHTML = `<div class="report-period">${snapshots.length} durable daily snapshot${snapshots.length === 1 ? '' : 's'} · ${escape(history.days)} days</div>${snapshots.length ? snapshots.map((snapshot) => `<article class="report-card"><div><span class="record-id">${escape(snapshot.period)}</span><h3>${escape(new Date(snapshot.capturedAt).toLocaleString())}</h3><p>${labels.map((label) => `${escape(label)}: ${escape(snapshot.metrics?.[label]?.value || '—')}`).join(' · ')}</p></div></article>`).join('') : '<div class="empty-state">No KPI snapshots yet. Capture the first snapshot to start the tenant trend history.</div>'}<div class="record-actions"><button type="button" class="ghost-btn" data-analytics-capture>Capture today</button></div>`;
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      const capture = list.querySelector('[data-analytics-capture]');
      capture.hidden = !['owner', 'accountant'].includes(repository.session?.owner?.role || '');
      capture.addEventListener('click', async () => { capture.disabled = true; try { const result = await repository.captureAnalyticsSnapshot(); notify(result.duplicate ? 'Today’s KPI snapshot is already current.' : 'KPI snapshot captured.'); render(await repository.getAnalyticsHistory(history.days)); } catch (error) { notify(error?.message || 'Could not capture KPI snapshot.'); capture.disabled = false; } });
    };
    button.addEventListener('click', async () => { button.disabled = true; try { await repository.captureAnalyticsSnapshot(); render(await repository.getAnalyticsHistory(30)); } catch (error) { notify(error?.message || 'KPI history unavailable.'); } finally { button.disabled = false; } });
    return true;
  };
  if (!start()) { const timer = setInterval(() => { if (start()) clearInterval(timer); }, 100); setTimeout(() => clearInterval(timer), 15000); }
})();
