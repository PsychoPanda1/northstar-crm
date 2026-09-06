(() => {
  const drawer = document.querySelector('#record-drawer');
  const list = document.querySelector('#record-list');
  if (!drawer || !list) return;
  const start = () => {
    const repository = window.northstarRepository;
    const anchor = document.querySelector('#accounting-provider-dispatch');
    if (!repository?.listAccountingSync || !anchor) { window.setTimeout(start, 100); return; }
    if (document.querySelector('#accounting-provider-queue')) return;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'ghost-btn'; button.id = 'accounting-provider-queue'; button.textContent = 'Accounting queue'; button.hidden = !['owner', 'accountant'].includes(window.sessionRole || ''); anchor.after(button);
    const load = async () => { button.disabled = true; try { const result = await repository.listAccountingSync(); drawer.dataset.view = 'accounting-queue'; document.querySelector('#drawer-title').textContent = 'Accounting provider queue'; document.querySelector('#record-search').value = ''; list.innerHTML = result.sync?.length ? result.sync.map((item) => `<article class="report-card"><div><span class="record-id">${escapeHtml(item.key)}</span><h3>${escapeHtml(item.recordType)} · ${escapeHtml(item.sourceId)}</h3><p>${escapeHtml(item.syncState)} · Attempts ${escapeHtml(item.attempt)}${item.error ? ` · ${escapeHtml(item.error)}` : ''}${item.providerReference ? ` · ${escapeHtml(item.providerReference)}` : ''}</p></div></article>`).join('') : '<div class="empty-state">No accounting sync records have been materialized.</div>'; drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); decorate(); } catch { if (typeof showToast === 'function') showToast('Accounting queue unavailable.'); } finally { button.disabled = false; } };
    const decorate = () => { if (drawer.dataset.view !== 'accounting-queue') return; list.querySelectorAll('.report-card').forEach((card) => { if (card.querySelector('[data-accounting-retry]') || !/Failed|Retry scheduled/.test(card.textContent || '')) return; const key = card.querySelector('.record-id')?.textContent?.trim(); if (!key) return; const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'ghost-btn'; retry.dataset.accountingRetry = key; retry.textContent = 'Retry provider sync'; card.querySelector('div')?.append(retry); }); };
    list.addEventListener('click', async (event) => { const retry = event.target.closest('[data-accounting-retry]'); if (!retry) return; retry.disabled = true; try { await repository.retryAccounting(retry.dataset.accountingRetry); if (typeof showToast === 'function') showToast('Accounting provider sync requeued.'); await load(); } catch { if (typeof showToast === 'function') showToast('Could not requeue accounting provider sync.'); retry.disabled = false; } });
    button.addEventListener('click', load); new MutationObserver(decorate).observe(list, { childList: true, subtree: true });
  };
  start();
})();
