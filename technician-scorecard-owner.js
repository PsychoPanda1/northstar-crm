(() => {
  const reportView = document.querySelector('#report-view');
  const repository = window.northstarRepository;
  if (!reportView || !repository?.getTechnicianScorecards || document.querySelector('#technician-scorecards-view')) return;
  const button = document.createElement('button');
  button.className = 'ghost-btn';
  button.id = 'technician-scorecards-view';
  button.textContent = 'Technician scorecards';
  reportView.after(button);
  const configButton = document.createElement('button');
  configButton.className = 'ghost-btn';
  configButton.id = 'technician-scorecards-config';
  configButton.textContent = 'Configure scorecard weights';
  reportView.after(configButton);
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  button.addEventListener('click', async () => {
    const startDate = window.prompt('Scorecard start date (YYYY-MM-DD, blank for all)', '') ?? '';
    const endDate = window.prompt('Scorecard end date (YYYY-MM-DD, blank for all)', '') ?? '';
    button.disabled = true;
    try {
      const report = await repository.getTechnicianScorecards({ startDate: startDate.trim(), endDate: endDate.trim() });
      const cards = (report.scorecards || []).map((item) => `<article class="report-card"><div><span class="record-id">${escape(item.technician)}</span><h3>${escape(item.grade)} · ${Number(item.score).toFixed(1)} / 100</h3><p>${item.completed} completed of ${item.jobs} jobs · ${Number(item.completionRate).toFixed(1)}% completion · ${Number(item.marginRate).toFixed(1)}% margin · ${item.noShows} no-shows</p></div><span class="record-status">${escape(item.grade)}</span></article>`).join('');
      drawer.dataset.view = 'technician-scorecards';
      drawerTitle.textContent = 'Technician scorecards';
      recordSearch.value = '';
      recordList.innerHTML = `<div class="report-period">${escape(report.period)} · weighted operational score: completion 40%, margin 25%, reliability 20%, time capture 15%</div>${cards || '<div class="empty-state">No technician activity matches this period.</div>'}`;
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
    } catch { showToast('Technician scorecards unavailable.'); } finally { button.disabled = false; }
  });
  configButton.addEventListener('click', async () => {
    configButton.disabled = true;
    try {
      const current = (await repository.getTechnicianScorecardConfig()).weights || { completion: 40, margin: 25, reliability: 20, timeCapture: 15 };
      const values = {};
      for (const [key, label] of [['completion', 'Completion'], ['margin', 'Margin'], ['reliability', 'Reliability'], ['timeCapture', 'Time capture']]) { const value = window.prompt(`${label} weight (all four weights must total 100)`, String(current[key])); if (value === null) return; values[key] = Number(value); }
      if (Object.values(values).some((value) => !Number.isInteger(value) || value < 0 || value > 100) || Object.values(values).reduce((sum, value) => sum + value, 0) !== 100) { showToast('Scorecard weights must be whole numbers totaling 100.'); return; }
      await repository.setTechnicianScorecardConfig(values);
      showToast('Technician scorecard weights saved.');
    } catch { showToast('Could not save technician scorecard weights.'); } finally { configButton.disabled = false; }
  });
})();
