(() => {
  const start = () => {
    const drawer = document.querySelector('#record-drawer');
    const list = document.querySelector('#record-list');
    const healthButton = document.querySelector('#integration-health-view');
    const repository = window.northstarRepository;
    if (!drawer || !list || !healthButton || !repository?.getIntegrationHealth) return false;
    const roles = {
      lead: ['owner', 'dispatcher'],
      message: ['owner', 'dispatcher'],
      payment: ['owner', 'accountant'],
      inventory: ['owner', 'dispatcher', 'accountant'],
      accounting: ['owner', 'accountant'],
      document: ['owner', 'dispatcher', 'accountant'],
      payroll: ['owner', 'accountant']
    };
    const role = () => repository.session?.owner?.role || '';
    const notify = (message) => {
      const toast = document.querySelector('#toast');
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2800);
    };
    const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
    const loadFailed = async (health) => {
      const [leads, messages, inventory, accounting, documents, payroll] = await Promise.all([
        repository.list?.('leads').catch(() => []) || [],
        repository.list?.('messages').catch(() => []) || [],
        repository.list?.('inventory-transactions').catch(() => []) || [],
        repository.listAccountingSync?.('Failed').then((result) => result.sync || []).catch(() => []) || [],
        repository.listDocumentDeliveries?.('Failed').then((result) => result.deliveries || []).catch(() => []) || [],
        repository.listPayrollRuns?.().then((result) => result.items || []).catch(() => []) || []
      ]);
      return [
        ...leads.filter((item) => item.providerDeliveryState === 'Failed').map((item) => ({ kind: 'lead', id: item.id, label: item.name || item.id, detail: item.providerError || 'Lead provider rejected delivery', retry: () => repository.retryLeadProvider(item.id) })),
        ...messages.filter((item) => item.status === 'Failed').map((item) => ({ kind: 'message', id: item.id, label: item.customer || item.id, detail: item.providerError || `${item.channel || 'Message'} delivery failed`, retry: () => repository.retryMessage(item.id) })),
        ...(health?.payments?.failedItems || []).map((item) => ({ kind: 'payment', id: item.id, label: `${item.customer} · ${item.amount}`, detail: item.providerError || `${item.method || 'Payment'} provider rejected payment`, retry: () => repository.retryPaymentIntent(item.id) })),
        ...inventory.filter((item) => item.providerSyncState === 'Failed').map((item) => ({ kind: 'inventory', id: item.id, label: item.material || item.id, detail: item.providerError || 'Inventory provider rejected sync', retry: () => repository.retryInventory(item.id) })),
        ...accounting.map((item) => ({ kind: 'accounting', id: item.key, label: `${item.recordType || 'Accounting'} · ${item.sourceId || item.key}`, detail: item.error || 'Accounting provider rejected sync', retry: () => repository.retryAccounting(item.key) })),
        ...documents.map((item) => ({ kind: 'document', id: item.id, label: `${item.documentType || 'Document'} · ${item.documentId || item.id}`, detail: item.providerError || 'Document provider rejected delivery', retry: () => repository.retryDocumentDelivery(item.id) })),
        ...payroll.filter((item) => item.providerSyncState === 'Failed').map((item) => ({ kind: 'payroll', id: item.id, label: item.period || item.id, detail: item.providerError || 'Payroll provider rejected handoff', retry: () => repository.retryPayrollRun(item.id) }))
      ].slice(0, 30);
    };
    const decorate = async () => {
      if (drawer.dataset.view !== 'integration-health' || list.querySelector('[data-integration-recovery-card]')) return;
      try {
        const health = await repository.getIntegrationHealth();
        const failures = await loadFailed(health);
        if (drawer.dataset.view !== 'integration-health' || list.querySelector('[data-integration-recovery-card]') || !failures.length) return;
        const card = document.createElement('article');
        card.className = 'report-card';
        card.dataset.integrationRecoveryCard = 'true';
        const rows = failures.map((item) => `<div class="record-actions" data-recovery-row="${escape(item.kind)}"><span class="muted">${escape(item.label)} · ${escape(item.detail)}</span><button type="button" class="ghost-btn" data-integration-recovery="${escape(item.id)}" data-integration-recovery-kind="${escape(item.kind)}">Retry</button></div>`).join('');
        card.innerHTML = `<div><span class="record-id">FAILED HANDOFFS</span><h3>${failures.length} provider failure${failures.length === 1 ? '' : 's'} need recovery</h3><p>Retryable records are grouped here so provider errors do not remain hidden in queue counts.</p>${rows}</div>`;
        list.querySelector('.report-period')?.after(card);
        card.querySelectorAll('[data-integration-recovery]').forEach((button) => {
          const item = failures.find((candidate) => candidate.id === button.dataset.integrationRecovery && candidate.kind === button.dataset.integrationRecoveryKind);
          button.hidden = !item || !roles[item.kind]?.includes(role());
          button.addEventListener('click', async () => {
            if (!item) return;
            button.disabled = true;
            try { await item.retry(); notify('Provider handoff requeued.'); healthButton.click(); }
            catch (error) { notify(error?.message || 'Could not requeue provider handoff.'); button.disabled = false; }
          });
        });
      } catch {}
    };
    new MutationObserver(() => { void decorate(); }).observe(list, { childList: true, subtree: true });
    new MutationObserver(() => { void decorate(); }).observe(drawer, { attributes: true, attributeFilter: ['data-view'] });
    void decorate();
    return true;
  };
  if (!start()) {
    const timer = setInterval(() => { if (start()) clearInterval(timer); }, 100);
    setTimeout(() => clearInterval(timer), 15000);
  }
})();
