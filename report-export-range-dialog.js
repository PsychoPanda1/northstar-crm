(() => {
  const repository = window.northstarRepository;
  const drawer = document.querySelector('#record-drawer');
  if (!repository?.exportRecords || !drawer || document.querySelector('#report-export-range-dialog')) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'report-export-range-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-export-range aria-label="Close">×</button><div class="dialog-kicker">REPORT EXPORT</div><h2>Export report data</h2><p>Choose an optional period for this CSV export. Existing report filters and grouping will be preserved.</p><form><label>Start date <span>(optional)</span><input name="startDate" type="date" /></label><label>End date <span>(optional)</span><input name="endDate" type="date" /></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-export-range>Cancel</button><button class="primary-btn" type="submit">Export CSV</button></div><p class="form-message" data-export-range-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-export-range-message]');
  let activeButton;
  const exportType = () => ({ reports: 'reports', marketing: 'marketing', campaigns: 'marketing-campaigns', technicians: 'technicians', commissions: 'technicians', payroll: 'payroll' }[drawer.dataset.view] || '');
  const open = (button) => { activeButton = button; form.reset(); message.textContent = ''; dialog.showModal(); form.elements.startDate.focus(); };
  dialog.querySelectorAll('[data-close-export-range]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const startDate = form.elements.startDate.value;
    const endDate = form.elements.endDate.value;
    if (startDate && endDate && startDate > endDate) { message.textContent = 'End date must be on or after the start date.'; return; }
    const type = exportType();
    if (!type) { message.textContent = 'Open a report workspace before exporting.'; return; }
    let filters = {}; let groupBy = '';
    try { filters = JSON.parse(drawer.dataset.reportFilters || '{}'); } catch { filters = {}; }
    groupBy = drawer.dataset.reportGroupBy || '';
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; if (activeButton) activeButton.disabled = true; message.textContent = 'Preparing CSV export…';
    try { await repository.exportRecords(type, { startDate, endDate }, filters, groupBy); dialog.close(); showToast('Report exported as CSV.'); }
    catch { message.textContent = 'Could not export this report. Confirm your session and report access.'; submit.disabled = false; if (activeButton) activeButton.disabled = false; }
  });
  document.addEventListener('click', (event) => { const button = event.target.closest('#export-records'); if (!button || !exportType()) return; event.preventDefault(); event.stopImmediatePropagation(); open(button); }, true);
})();
