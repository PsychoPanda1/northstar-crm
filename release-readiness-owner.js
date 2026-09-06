(() => {
  const start = () => {
    const repository = window.northstarRepository;
    const anchor = document.querySelector('#operations-metrics-view') || document.querySelector('#report-view');
    const drawer = document.querySelector('#record-drawer');
    const title = document.querySelector('#drawer-title');
    const list = document.querySelector('#record-list');
    if (!repository || !anchor || !drawer || !title || !list) return false;
    if (document.querySelector('#release-readiness-view')) return true;
    const button = document.createElement('button');
    button.className = 'ghost-btn';
    button.id = 'release-readiness-view';
    button.textContent = 'Release readiness';
    button.hidden = !['owner', 'accountant'].includes(repository.session?.owner?.role || '');
    anchor.after(button);
    const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const readiness = await repository.getReadiness();
        const remediation = { configuration: 'Review production environment values and tenant mappings.', allowedOriginsConfiguration: 'Set NORTHSTAR_ALLOWED_ORIGINS to HTTPS landing-page origins.', serviceOriginConfiguration: 'Align NORTHSTAR_SERVICE_ORIGINS_JSON with each landing-page service.', sessionSecret: 'Replace the default NORTHSTAR_SESSION_SECRET with a strong secret.', ownerAuth: 'Provision an owner password digest or an OIDC owner account.', identityProviderConfiguration: 'Verify the HTTPS OIDC issuer, audience, JWKS URL, and provisioned subjects.', publicUrlConfiguration: 'Set NORTHSTAR_PUBLIC_URL to the deployed HTTPS CRM origin.', persistentState: 'Check that the configured data path is writable and mounted persistently.', persistentStorage: 'Run storage integrity checks and inspect the persistent volume.', tenantDataIntegrity: 'Repair tenant records or tenant mappings before accepting traffic.', auditLedger: 'Restore or repair the audit ledger before production use.', webhookRotationConfiguration: 'Configure current webhook secrets and rotate previous keys safely.', liveLeadProvider: 'Configure NORTHSTAR_LEAD_PROVIDER_URL or disable live-provider enforcement intentionally.', liveInventoryProvider: 'Configure NORTHSTAR_INVENTORY_PROVIDER_URL or disable live-provider enforcement intentionally.', liveAccountingProvider: 'Configure NORTHSTAR_ACCOUNTING_PROVIDER_URL or disable live-provider enforcement intentionally.', liveMessageProvider: 'Configure NORTHSTAR_MESSAGE_PROVIDER_URL or disable live-provider enforcement intentionally.', livePaymentProvider: 'Configure NORTHSTAR_PAYMENT_PROVIDER_URL or disable live-provider enforcement intentionally.', liveDocumentProvider: 'Configure NORTHSTAR_DOCUMENT_PROVIDER_URL or disable live-provider enforcement intentionally.' };
        const checks = Object.entries(readiness.checks || {}).map(([key, value]) => `<article class="report-card"><div><span class="record-id">${escape(key)}</span><h3>${value ? 'Ready' : 'Needs attention'}</h3><p>${value ? 'This deployment check is passing.' : escape(remediation[key] || 'Resolve this configuration or persistence check before production use.')}</p></div></article>`).join('');
        drawer.dataset.view = 'release-readiness';
        title.textContent = 'Release readiness';
        document.querySelector('#record-search').value = '';
        list.innerHTML = `<div class="report-period">${readiness.ok ? 'READY' : 'NOT READY'} · checked ${escape(new Date().toLocaleString())}</div>${checks || '<div class="empty-state">No readiness checks were returned.</div>'}`;
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
      } catch {
        const toast = document.querySelector('#toast');
        if (toast) { toast.textContent = 'Release readiness is unavailable.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); }
      } finally { button.disabled = false; }
    });
    return true;
  };
  if (!start()) { const timer = setInterval(() => { if (start()) clearInterval(timer); }, 100); setTimeout(() => clearInterval(timer), 15000); }
})();
