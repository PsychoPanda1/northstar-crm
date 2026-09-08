(() => {
  const repository = window.northstarRepository;
  const reportView = document.querySelector('#report-view');
  const list = document.querySelector('#record-list');
  const drawer = document.querySelector('#record-drawer');
  const title = document.querySelector('#drawer-title');
  const search = document.querySelector('#record-search');
  if (!repository?.getTechnicianScorecards || !reportView || !list || !drawer || document.querySelector('#technician-scorecard-period-dialog')) return;

  const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const dialog = document.createElement('dialog');
  dialog.id = 'technician-scorecard-period-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-scorecard-period aria-label="Close">×</button><div class="dialog-kicker">TECHNICIAN PERFORMANCE</div><h2>Scorecard period</h2><p>Choose an optional period for the scorecards. Leaving both dates blank includes all available tenant-scoped activity.</p><form><label>Start date <span>(optional)</span><input name="startDate" type="date" /></label><label>End date <span>(optional)</span><input name="endDate" type="date" /></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-scorecard-period>Cancel</button><button class="primary-btn" type="submit">View scorecards</button></div><p class="form-message" data-scorecard-period-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-scorecard-period-message]');
  let activeButton;
  const close = () => { if (dialog.open) dialog.close(); };
  const open = (button) => { activeButton = button; form.reset(); message.textContent = ''; dialog.showModal(); form.elements.startDate.focus(); };
  dialog.querySelectorAll('[data-close-scorecard-period]').forEach((button) => button.addEventListener('click', close));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const startDate = form.elements.startDate.value;
    const endDate = form.elements.endDate.value;
    if (startDate && endDate && startDate > endDate) { message.textContent = 'End date must be on or after the start date.'; return; }
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true; if (activeButton) activeButton.disabled = true; message.textContent = 'Loading scorecards…';
    try {
      const report = await repository.getTechnicianScorecards({ startDate, endDate });
      const cards = (report.scorecards || []).map((item) => `<article class="report-card"><div><span class="record-id">${escape(item.technician)}</span><h3>${escape(item.grade)} · ${Number(item.score).toFixed(1)} / 100</h3><p>${item.completed} completed of ${item.jobs} jobs · ${Number(item.completionRate).toFixed(1)}% completion · ${Number(item.marginRate).toFixed(1)}% margin · ${item.noShows} no-shows</p></div><span class="record-status">${escape(item.grade)}</span></article>`).join('');
      drawer.dataset.view = 'technician-scorecards'; title.textContent = 'Technician scorecards'; search.value = '';
      list.innerHTML = `<div class="report-period">${escape(report.period)} · weighted operational score: completion 40%, margin 25%, reliability 20%, time capture 15%</div>${cards || '<div class="empty-state">No technician activity matches this period.</div>'}`;
      drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); close();
    } catch { message.textContent = 'Technician scorecards are unavailable. Check the selected period and try again.'; }
    finally { submit.disabled = false; if (activeButton) activeButton.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('#technician-scorecards-view');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation(); open(button);
  }, true);
})();
