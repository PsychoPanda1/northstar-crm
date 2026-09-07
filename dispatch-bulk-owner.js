(() => {
  const toolbar = document.querySelector('.drawer-toolbar');
  const drawer = document.querySelector('#record-drawer');
  const list = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!toolbar || !drawer || !list || !repository?.bulkAssignJobs) return;

  const panel = document.createElement('div');
  panel.className = 'request-filters';
  panel.dataset.dispatchBulkActions = 'true';
  panel.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;width:100%;';
  panel.innerHTML = '<span class="muted" data-dispatch-selection>0 selected</span><button class="ghost-btn" type="button" data-dispatch-select-visible>Select visible jobs</button><button class="ghost-btn" type="button" data-dispatch-bulk-assign>Assign selected</button>';
  toolbar.append(panel);

  const selection = () => [...list.querySelectorAll('[data-bulk-job]:checked')].map((input) => input.dataset.bulkJob).filter(Boolean);
  const toast = (message) => { const target = document.querySelector('#toast'); if (!target) return; target.textContent = message; target.classList.add('show'); setTimeout(() => target.classList.remove('show'), 2800); };
  const sync = () => {
    const active = drawer.dataset.view === 'dispatch';
    panel.hidden = !active;
    const count = selection().length;
    panel.querySelector('[data-dispatch-selection]').textContent = `${count} selected`;
    panel.querySelector('[data-dispatch-bulk-assign]').disabled = !count;
    panel.querySelector('[data-dispatch-select-visible]').textContent = count ? 'Clear visible selection' : 'Select visible jobs';
  };
  const observe = new MutationObserver(sync);
  observe.observe(list, { childList: true, subtree: true });
  observe.observe(drawer, { attributes: true, attributeFilter: ['data-view'] });
  list.addEventListener('change', (event) => { if (event.target.matches('[data-bulk-job]')) sync(); });
  panel.querySelector('[data-dispatch-select-visible]').addEventListener('click', () => {
    const inputs = [...list.querySelectorAll('[data-bulk-job]')];
    const shouldSelect = !selection().length;
    inputs.forEach((input) => { input.checked = shouldSelect; });
    sync();
  });
  panel.querySelector('[data-dispatch-bulk-assign]').addEventListener('click', async () => {
    const jobIds = selection();
    if (!jobIds.length) return;
    const members = (await repository.list('team')).filter((member) => ['Lead technician', 'Field technician', 'Apprentice'].includes(member.role));
    if (!members.length) { toast('No eligible field technicians are configured.'); return; }
    const selected = window.prompt(`Assign ${jobIds.length} selected job${jobIds.length === 1 ? '' : 's'} to:\n${members.map((member) => member.name).join(', ')}`, members[0].name);
    if (selected === null) return;
    const technician = members.find((member) => member.name.toLowerCase() === selected.trim().toLowerCase());
    if (!technician) { toast('Choose a technician from the current field roster.'); return; }
    const button = panel.querySelector('[data-dispatch-bulk-assign]');
    button.disabled = true;
    try {
      const result = await repository.bulkAssignJobs(jobIds, technician.name);
      toast(result.duplicate ? 'That bulk assignment was already applied.' : `${result.jobs?.length || jobIds.length} job${jobIds.length === 1 ? '' : 's'} assigned to ${technician.name}.`);
      document.querySelector('#drawer-refresh')?.click();
    } catch (error) {
      toast(error?.message === 'bulk assignment failed' ? 'Bulk assignment was rejected. Check skills and schedule conflicts.' : 'Bulk assignment unavailable.');
    } finally { button.disabled = false; sync(); }
  });
  sync();
})();
