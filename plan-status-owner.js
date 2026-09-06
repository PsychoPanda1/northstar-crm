(() => {
  const start = () => {
    const repository = window.northstarRepository;
    const drawer = document.querySelector('#record-drawer');
    const list = document.querySelector('#record-list');
    if (!repository || !drawer || !list || !repository.updatePlanStatus) return false;
    const role = repository.session?.owner?.role || 'owner';
    const decorate = () => {
      if (drawer.dataset.view !== 'plans' || !['owner', 'dispatcher'].includes(role)) return;
      list.querySelectorAll('.record-card').forEach((card) => {
        const id = card.querySelector('.record-id')?.textContent?.trim();
        const status = card.querySelector('.record-status')?.textContent?.trim();
        if (!id || !/^PLAN-/.test(id) || !status || status === 'Canceled' || card.querySelector('[data-plan-status-action]')) return;
        const actions = card.querySelector('.record-actions');
        if (!actions) return;
        const options = status === 'Paused' ? [['resume', 'Resume plan'], ['cancel', 'Cancel plan']] : [['pause', 'Pause plan'], ['cancel', 'Cancel plan']];
        options.forEach(([action, label]) => {
          const button = document.createElement('button');
          button.className = 'ghost-btn';
          button.dataset.planStatusAction = action;
          button.dataset.planId = id;
          button.textContent = label;
          actions.append(button);
        });
      });
    };
    new MutationObserver(decorate).observe(list, { childList: true, subtree: true });
    new MutationObserver(decorate).observe(drawer, { attributes: true, attributeFilter: ['data-view'] });
    list.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-plan-status-action]');
      if (!button) return;
      const action = button.dataset.planStatusAction;
      if (action === 'cancel' && !window.confirm('Cancel this service plan and its future non-terminal visits?')) return;
      const note = window.prompt(`${action[0].toUpperCase() + action.slice(1)} note (optional)`, '') ?? '';
      button.disabled = true;
      try {
        const result = await repository.updatePlanStatus(button.dataset.planId, action, note.trim());
        const canceled = Number(result.canceledJobs || 0);
        const suffix = canceled ? ` · ${canceled} future visit${canceled === 1 ? '' : 's'} canceled` : '';
        const toast = document.querySelector('#toast');
        if (toast) { toast.textContent = `Plan ${action}d${suffix}.`; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); }
        document.querySelector('#drawer-refresh')?.click();
      } catch {
        const toast = document.querySelector('#toast');
        if (toast) { toast.textContent = 'Could not update the service plan lifecycle.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); }
        button.disabled = false;
      }
    });
    decorate();
    return true;
  };
  if (!start()) { const timer = setInterval(() => { if (start()) clearInterval(timer); }, 100); setTimeout(() => clearInterval(timer), 15000); }
})();
