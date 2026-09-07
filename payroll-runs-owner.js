(() => {
  const repository = window.northstarRepository;
  const drawer = document.querySelector('#record-drawer');
  const list = document.querySelector('#record-list');
  if (!repository || !drawer || !list) return;
  const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const refresh = async () => {
    const result = await repository.listPayrollRuns();
    const runs = result.items || [];
    const section = document.createElement('section');
    section.className = 'profile-section';
    section.dataset.payrollRuns = 'true';
    section.innerHTML = `<span class="record-id">PAYROLL PERIODS</span>${runs.length ? runs.map((run) => { const provider = run.providerSyncState ? ` · Provider ${run.providerSyncState}` : ''; const action = run.status === 'Draft' ? `<button class="ghost-btn" data-payroll-approve="${escape(run.id)}">Approve handoff</button>` : run.providerSyncState === 'Failed' ? `<button class="ghost-btn" data-payroll-retry="${escape(run.id)}">Retry handoff</button>` : `<span class="record-status">${run.status === 'Approved' ? 'Approved' : escape(run.status)}</span>`; return `<article class="record-card"><div><h3>${escape(run.period)}</h3><p>${escape(run.status)}${escape(provider)} · ${Number(run.totals?.completedJobs || 0)} completed jobs · $${Number(run.totals?.commissionDue || 0).toFixed(2)} commission due</p></div>${action}</article>`; }).join('') : '<div class="empty-state">No payroll periods have been created.</div>'}`;
    list.append(section);
    section.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-payroll-approve]');
      const retry = event.target.closest('[data-payroll-retry]');
      if (retry) { retry.disabled = true; try { await repository.retryPayrollRun(retry.dataset.payrollRetry); showToast('Payroll provider handoff requeued.'); section.remove(); await refresh(); } catch (error) { showToast(error?.message || 'Could not requeue payroll handoff.'); retry.disabled = false; } return; }
      if (!button) return;
      button.disabled = true;
      try { await repository.approvePayrollRun(button.dataset.payrollApprove); showToast('Payroll period approved for handoff.'); section.remove(); await refresh(); } catch (error) { showToast(error?.message || 'Could not approve payroll period.'); button.disabled = false; }
    });
  };
  const decorate = () => {
    if (drawer.dataset.view !== 'payroll' || list.querySelector('[data-payroll-run-create]')) return;
    const header = list.querySelector('.report-period');
    if (!header || !['owner', 'accountant'].includes(repository.session?.owner?.role || '')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ghost-btn';
    button.dataset.payrollRunCreate = 'true';
    button.textContent = 'Create payroll period';
    button.style.marginTop = '8px';
    button.addEventListener('click', async () => {
      const startDate = window.prompt('Payroll start date (YYYY-MM-DD, blank for all)', '');
      if (startDate === null) return;
      const endDate = window.prompt('Payroll end date (YYYY-MM-DD, blank for all)', '');
      if (endDate === null) return;
      button.disabled = true;
      try { await repository.createPayrollRun(startDate.trim(), endDate.trim()); showToast('Payroll period snapshot created.'); button.remove(); await refresh(); } catch (error) { showToast(error?.message || 'Could not create payroll period.'); button.disabled = false; }
    });
    const dispatch = document.createElement('button');
    dispatch.type = 'button';
    dispatch.className = 'ghost-btn';
    dispatch.dataset.payrollDispatch = 'true';
    dispatch.textContent = 'Send approved periods';
    dispatch.style.marginTop = '8px';
    dispatch.addEventListener('click', async () => { dispatch.disabled = true; try { const result = await repository.dispatchPayrollRuns(20); showToast(`${Number(result.delivered || 0)} payroll period${Number(result.delivered || 0) === 1 ? '' : 's'} sent${result.failed ? ` · ${result.failed} failed` : ''}.`); } catch (error) { showToast(error?.message || 'Payroll provider is not configured.'); } finally { dispatch.disabled = false; } });
    header.append(document.createElement('br'), button, document.createElement('br'), dispatch);
    refresh().catch(() => {});
  };
  new MutationObserver(decorate).observe(list, { childList: true, subtree: true });
  new MutationObserver(decorate).observe(drawer, { attributes: true, attributeFilter: ['data-view'] });
  decorate();
})();
