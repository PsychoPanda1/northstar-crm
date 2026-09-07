(() => {
  const start = () => {
    const drawer = document.querySelector('#record-drawer');
    const list = document.querySelector('#record-list');
    const healthButton = document.querySelector('#integration-health-view');
    const repository = window.northstarRepository;
    if (!drawer || !list || !healthButton || !repository?.getIntegrationHealth || !repository?.dispatchPayrollRuns) return false;
    const notify = (message) => { const toast = document.querySelector('#toast'); if (!toast) return; toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); };
    const decorate = async () => {
      if (drawer.dataset.view !== 'integration-health' || list.querySelector('[data-payroll-health-card]')) return;
      try {
        const health = await repository.getIntegrationHealth();
        if (drawer.dataset.view !== 'integration-health' || list.querySelector('[data-payroll-health-card]')) return;
        const item = health.payroll || {};
        const card = document.createElement('article');
        card.className = 'report-card';
        card.dataset.payrollHealthCard = 'true';
        card.innerHTML = `<div><span class="record-id">PAYROLL HANDOFF</span><h3>${Number(item.pending || 0)} pending · ${Number(item.failed || 0)} failed</h3><p>${Number(item.delivered || 0)} delivered · ${Number(item.retrying || 0)} retrying · Approved payroll periods awaiting provider synchronization.</p><div class="record-actions"><button class="ghost-btn" data-payroll-health-dispatch>Send payroll</button></div></div>`;
        list.append(card);
        const button = card.querySelector('[data-payroll-health-dispatch]');
        button.hidden = !['owner', 'accountant'].includes(repository.session?.owner?.role || '');
        button.addEventListener('click', async () => {
          button.disabled = true;
          try {
            const result = await repository.dispatchPayrollRuns(20);
            notify(`${result.delivered || 0} payroll run${result.delivered === 1 ? '' : 's'} processed.`);
            card.remove();
            decorate();
          } catch (error) {
            notify(error?.message || 'Could not dispatch payroll.');
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
