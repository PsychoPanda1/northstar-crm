(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#report-range-dialog')) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'report-range-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-report-range aria-label="Close">×</button><div class="dialog-kicker">REPORTING</div><h2 data-report-range-title>Choose report period</h2><p>Set an optional period for the report. Leaving both dates blank includes all available tenant-scoped history.</p><form><label>Start date <span>(optional)</span><input name="startDate" type="date" /></label><label>End date <span>(optional)</span><input name="endDate" type="date" /></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-report-range>Cancel</button><button class="primary-btn" type="submit">Run report</button></div><p class="form-message" data-report-range-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-report-range-message]');
  const title = dialog.querySelector('[data-report-range-title]');
  const close = () => { if (dialog.open) dialog.close(); };
  let reportType = '';
  let previousMarketing;
  let previousTechnician;
  const open = (type) => new Promise((resolve, reject) => {
    reportType = type; form.reset(); message.textContent = ''; title.textContent = type === 'marketing' ? 'Marketing report period' : 'Technician report period'; dialog.showModal(); form.elements.startDate.focus();
    dialog.dataset.resolve = ''; dialog._resolve = resolve; dialog._reject = reject;
  });
  dialog.querySelectorAll('[data-close-report-range]').forEach((button) => button.addEventListener('click', () => { dialog._reject?.(new Error('report_cancelled')); close(); }));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const startDate = form.elements.startDate.value;
    const endDate = form.elements.endDate.value;
    if (startDate && endDate && startDate > endDate) { message.textContent = 'End date must be on or after the start date.'; return; }
    const resolve = dialog._resolve;
    dialog._resolve = null; dialog._reject = null; close();
    try { resolve?.(reportType === 'marketing' ? await previousMarketing({ startDate, endDate }) : await previousTechnician({ startDate, endDate })); }
    catch (error) { resolve?.(Promise.reject(error)); }
  });
  previousMarketing = repository.getMarketingReport?.bind(repository);
  previousTechnician = repository.getTechnicianReport?.bind(repository);
  if (previousMarketing) repository.getMarketingReport = (range) => range ? previousMarketing(range) : open('marketing');
  if (previousTechnician) repository.getTechnicianReport = (range) => range ? previousTechnician(range) : open('technician');
})();
