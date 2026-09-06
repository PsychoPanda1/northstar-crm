(() => {
  const list = document.querySelector('#record-list');
  const drawer = document.querySelector('#record-drawer');
  const repository = window.northstarRepository;
  if (!list || !drawer || !repository) return;
  let requests = [];
  const decorate = async () => {
    if (drawer.dataset.view !== 'requests' || !repository.remote) return;
    try { requests = (await repository.listPage('requests', { page: 1, pageSize: 50 })).items || []; } catch { return; }
    list.querySelectorAll('.record-card').forEach((card) => {
      const id = card.querySelector('.record-id')?.textContent?.trim();
      const request = requests.find((item) => item.id === id);
      if (!request?.planId || request.type !== 'Service plan request' || request.status === 'Resolved' || card.querySelector('[data-plan-request-fulfill]')) return;
      const actions = card.querySelector('.record-actions') || (() => { const node = document.createElement('div'); node.className = 'record-actions'; card.querySelector('div')?.append(node); return node; })();
      const button = document.createElement('button'); button.type = 'button'; button.className = 'ghost-btn'; button.dataset.planRequestFulfill = request.id; button.textContent = `${request.requestedAction || 'Fulfill'} plan request`;
      button.addEventListener('click', async () => { const note = window.prompt('Resolution note', `Fulfilled ${request.requestedAction} service-plan request.`); if (!note?.trim()) return; button.disabled = true; try { const result = await repository.fulfillServicePlanRequest(request.id, note.trim()); window.alert(`${result.plan?.service || 'Service plan'} is now ${result.plan?.status}.`); window.location.reload(); } catch { button.disabled = false; window.alert('Could not fulfill this service-plan request.'); } });
      actions.append(button);
    });
  };
  new MutationObserver(() => void decorate()).observe(list, { childList: true, subtree: true });
  new MutationObserver(() => void decorate()).observe(drawer, { attributes: true, attributeFilter: ['data-view'] });
  void decorate();
})();
