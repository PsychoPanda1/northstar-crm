(() => {
  const start = () => {
  const drawer = document.querySelector('#record-drawer');
  const list = document.querySelector('#record-list');
  const operationsButton = document.querySelector('#operations-metrics-view');
  const repository = window.northstarRepository;
  if (!drawer || !list || !operationsButton || !repository?.getOperationalMetrics || !repository?.dispatchPayrollRuns) return false;
  const decorate = async () => {
    if (drawer.dataset.view !== 'operational-metrics' || list.querySelector('[data-payroll-operations-card]')) return;
    try {
      const metrics = await repository.getOperationalMetrics();
      if (drawer.dataset.view !== 'operational-metrics' || list.querySelector('[data-payroll-operations-card]')) return;
      const item = metrics.queues?.payroll;
      if (!item) return;
      const card = document.createElement('article');
      card.className = 'report-card';
      card.dataset.payrollOperationsCard = 'true';
      const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
      const pending = Number(item.pending || 0);
      const failed = Number(item.failed || 0);
      card.innerHTML = `<div><span class="record-id">PAYROLL</span><h3>${pending} pending · ${failed} failed</h3><p>${Number(item.retrying || 0)} retrying · Approved payroll periods awaiting provider handoff.</p>${pending ? '<div class="record-actions"><button class="ghost-btn" data-payroll-operations-dispatch>Send payroll</button></div>' : ''}${failed ? '<div data-payroll-failed-runs></div>' : ''}</div>`;
      list.querySelector('.report-period')?.after(card);
      if (failed && repository.listPayrollRuns && repository.retryPayrollRun) {
        const failedRuns = (await repository.listPayrollRuns()).items?.filter((run) => run.providerSyncState === 'Failed') || [];
        const failedTarget = card.querySelector('[data-payroll-failed-runs]');
        if (failedTarget) failedTarget.innerHTML = failedRuns.slice(0, 5).map((run) => `<div class="record-actions"><span class="muted">${escape(run.period)} · handoff failed</span><button class="ghost-btn" data-payroll-operations-retry="${escape(run.id)}">Retry handoff</button></div>`).join('');
        failedTarget?.querySelectorAll('[data-payroll-operations-retry]').forEach((retry) => retry.addEventListener('click', async () => { retry.disabled = true; try { await repository.retryPayrollRun(retry.dataset.payrollOperationsRetry); const toast = document.querySelector('#toast'); if (toast) { toast.textContent = 'Payroll handoff requeued.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); } operationsButton.click(); } catch (error) { const toast = document.querySelector('#toast'); if (toast) { toast.textContent = error?.message || 'Could not retry payroll handoff.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); } retry.disabled = false; } }));
      }
      const button = card.querySelector('[data-payroll-operations-dispatch]');
      if (!button) return;
      button.hidden = !['owner', 'accountant'].includes(repository.session?.owner?.role || '');
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const result = await repository.dispatchPayrollRuns(20);
          const processed = result.delivered ?? result.sent ?? 0;
          const message = `${processed} payroll run${processed === 1 ? '' : 's'} processed${result.retrying ? ` · ${result.retrying} retrying` : ''}${result.failed ? ` · ${result.failed} failed` : ''}.`;
          const toast = document.querySelector('#toast');
          if (toast) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); }
          operationsButton.click();
        } catch (error) {
          const toast = document.querySelector('#toast');
          if (toast) { toast.textContent = error?.message || 'Could not process payroll handoff.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); }
          button.disabled = false;
        }
      });
    } catch {}
  };
  new MutationObserver(() => { void decorate(); }).observe(list, { childList: true, subtree: true });
  new MutationObserver(() => { void decorate(); }).observe(drawer, { attributes: true, attributeFilter: ['data-view'] });
  decorate();
  return true;
  };
  if (!start()) { const timer = setInterval(() => { if (start()) clearInterval(timer); }, 100); setTimeout(() => clearInterval(timer), 15000); }
})();
