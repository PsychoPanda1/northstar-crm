(() => {
  const link = document.querySelector('a[href="#settings"]');
  if (!link) return;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const openSettings = async (event) => {
    event.preventDefault();
    const repository = window.northstarRepository;
    const drawer = document.querySelector('#record-drawer');
    const title = document.querySelector('#drawer-title');
    const list = document.querySelector('#record-list');
    if (!repository || !drawer || !title || !list) return;
    title.textContent = 'Workspace settings';
    drawer.dataset.view = 'settings';
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    list.innerHTML = '<div class="empty-state">Loading workspace configuration…</div>';
    try {
      const health = repository.remote ? await repository.getIntegrationHealth() : null;
      const workspace = repository.session?.tenant || repository.tenant || {};
      const serviceKey = new URLSearchParams(window.location.search).get('service') || repository.tenant?.slug || '';
      const origin = window.location.origin;
      const checks = health ? Object.entries(health.checks || {}).map(([key, value]) => `<article class="report-card"><div><span class="record-id">${escapeHtml(key)}</span><h3>${value ? 'Ready' : 'Needs attention'}</h3><p>${value ? 'The current operational check is healthy.' : 'Review deployment configuration before relying on this workflow.'}</p></div></article>`).join('') : '<article class="report-card"><div><span class="record-id">LOCAL PREVIEW</span><h3>Demo adapter active</h3><p>Settings shown here are local preview metadata. Production values are read from the authenticated tenant session.</p></div></article>';
      list.innerHTML = `<div class="report-period">Authenticated tenant configuration · secrets are never displayed</div><article class="report-card"><div><span class="record-id">WORKSPACE</span><h3>${escapeHtml(workspace.businessName || 'Configured workspace')}</h3><p>${escapeHtml(workspace.serviceLabel || 'Service operations')} · ${escapeHtml(workspace.timeZone || 'Timezone configured server-side')}</p></div></article><article class="record-card"><div><span class="record-id">DATA PORTABILITY</span><h3>Owner migration snapshot</h3><p>Download a tenant-scoped JSON snapshot for backup or managed-storage migration. Sensitive control fields are removed.</p><div class="record-actions"><button class="ghost-btn" type="button" data-settings-snapshot>Download snapshot</button><button class="ghost-btn" type="button" data-settings-validate-snapshot>Validate snapshot</button><input type="file" accept="application/json,.json" hidden data-settings-snapshot-input /></div></div></article><article class="record-card"><div><span class="record-id">LANDING PAGE HANDOFF</span><h3>Connected service: ${escapeHtml(serviceKey || 'current tenant')}</h3><p>Booking <code>${escapeHtml(origin)}/booking.html?service=${encodeURIComponent(serviceKey)}</code> · Owner portal <code>${escapeHtml(origin)}/portal?service=${encodeURIComponent(serviceKey)}</code></p></div></article><article class="record-card"><div><span class="record-id">PUBLIC INTEGRATION</span><h3>Versioned tenant manifest</h3><p><code>/api/public/tenant?service=${encodeURIComponent(serviceKey)}</code> · availability, catalog, leads, bookings, and owner handoff are tenant-scoped.</p></div></article>${checks}`;
      list.insertAdjacentHTML('beforeend', '<article class="record-card"><div><span class="record-id">LEAD PIPELINE</span><h3>Customize lead stages</h3><p>Use the stages that match this service business. Existing leads prevent removal of a stage until they are moved.</p><div class="record-actions"><input type="text" data-settings-lead-stages placeholder="New, Contacted, Qualified" aria-label="Lead stages, comma separated" /><button class="ghost-btn" type="button" data-settings-save-lead-stages>Save stages</button></div><p data-settings-lead-stages-status class="muted"></p></div></article>');
      const stageInput = list.querySelector('[data-settings-lead-stages]');
      const stageSave = list.querySelector('[data-settings-save-lead-stages]');
      const stageStatus = list.querySelector('[data-settings-lead-stages-status]');
      try { const leadStageResult = await repository.getLeadStages(); stageInput.value = (leadStageResult.stages || []).filter((stage) => stage !== 'Converted').join(', '); } catch { stageStatus.textContent = 'Lead stage configuration unavailable.'; stageSave.disabled = true; }
      if (repository.session?.owner?.role === 'owner') stageSave?.addEventListener('click', async () => { const stages = stageInput.value.split(',').map((stage) => stage.trim()).filter(Boolean); stageSave.disabled = true; stageStatus.textContent = 'Saving…'; try { const result = await repository.updateLeadStages(stages); stageInput.value = (result.stages || []).filter((stage) => stage !== 'Converted').join(', '); stageStatus.textContent = 'Lead stages saved.'; } catch (error) { stageStatus.textContent = error.message === 'existing_leads_use_removed_stage' ? 'Move existing leads out of a stage before removing it.' : 'Could not save lead stages.'; } finally { stageSave.disabled = false; } }); else { stageInput.disabled = true; stageSave.remove(); stageStatus.textContent = 'Only owners can change pipeline stages.'; }
      const snapshotButton = list.querySelector('[data-settings-snapshot]');
      const validateButton = list.querySelector('[data-settings-validate-snapshot]');
      const snapshotInput = list.querySelector('[data-settings-snapshot-input]');
      if (repository.session?.owner?.role === 'owner') {
        snapshotButton?.addEventListener('click', async () => { snapshotButton.disabled = true; try { await repository.exportRecords('tenant-snapshot'); } catch { snapshotButton.disabled = false; return; } snapshotButton.textContent = 'Snapshot downloaded'; });
        validateButton?.addEventListener('click', () => snapshotInput?.click());
        snapshotInput?.addEventListener('change', async () => { const file = snapshotInput.files?.[0]; if (!file) return; validateButton.disabled = true; validateButton.textContent = 'Validating…'; try { const result = await repository.validateTenantSnapshot(JSON.parse(await file.text())); validateButton.textContent = result.valid ? 'Snapshot is valid' : `${result.errors.length} validation issue${result.errors.length === 1 ? '' : 's'}`; } catch { validateButton.textContent = 'Could not validate'; } finally { validateButton.disabled = false; snapshotInput.value = ''; } });
      } else { snapshotButton?.remove(); validateButton?.remove(); snapshotInput?.remove(); }
    } catch {
      list.innerHTML = '<div class="empty-state">Workspace settings are unavailable. Check the authenticated session and integration configuration.</div>';
    }
  };
  link.addEventListener('click', openSettings);
})();
