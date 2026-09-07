(() => {
  const start = () => {
  const switcher = document.querySelector('#workspace-switcher');
  const repository = window.northstarRepository;
  if (!switcher || !repository?.listServices || document.querySelector('#service-switcher-dialog')) return false;

  const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const currentService = new URLSearchParams(window.location.search).get('service') || 'default';
  const dialog = document.createElement('dialog');
  dialog.className = 'workflow-dialog';
  dialog.id = 'service-switcher-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-service-switcher aria-label="Close">×</button><div class="dialog-kicker">CONNECTED LANDING PAGES</div><h2>Switch service workspace</h2><p>Open the tenant workspace connected to one of your service landing pages. Your records and permissions remain tenant-scoped.</p><div data-service-switcher-list class="record-actions" style="display:grid;gap:8px"></div><p class="form-message" data-service-switcher-status role="status" aria-live="polite"></p>';
  document.body.append(dialog);
  dialog.querySelector('[data-close-service-switcher]').addEventListener('click', () => dialog.close());

  const load = async () => {
    const list = dialog.querySelector('[data-service-switcher-list]');
    const status = dialog.querySelector('[data-service-switcher-status]');
    list.innerHTML = '<span class="muted">Loading connected service pages…</span>';
    status.textContent = '';
    try {
      const services = await repository.listServices();
      if (!services.length) { list.innerHTML = '<span class="muted">No connected service pages are available.</span>'; return; }
      list.innerHTML = services.map((item) => {
        const service = String(item.service || '').trim();
        const selected = service === currentService;
        return `<button type="button" class="${selected ? 'primary-btn' : 'ghost-btn'}" data-service-choice="${escape(service)}" ${selected ? 'aria-current="page"' : ''}>${escape(service)}${selected ? ' · current' : ''}</button>`;
      }).join('');
      list.querySelectorAll('[data-service-choice]').forEach((button) => button.addEventListener('click', () => {
        const service = button.dataset.serviceChoice;
        if (!service || service === currentService) { dialog.close(); return; }
        window.location.href = `/?service=${encodeURIComponent(service)}`;
      }));
    } catch {
      list.innerHTML = '<span class="muted">Connected service pages are unavailable.</span>';
      status.textContent = 'Refresh the workspace and try again.';
    }
  };

  switcher.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    void load();
    dialog.showModal();
  }, true);
  return true;
  };
  if (!start()) { const timer = setInterval(() => { if (start()) clearInterval(timer); }, 100); setTimeout(() => clearInterval(timer), 15000); }
})();
