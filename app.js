async function bootstrap() {
const tenant = resolveTenant();
const repository = new NorthstarDemoRepository(tenant);
await repository.ready;
const dashboard = repository.getDashboard();
document.documentElement.style.setProperty('--tenant-accent', tenant.accent);
document.documentElement.style.setProperty('--tenant-accent-soft', tenant.accentSoft);
document.querySelectorAll('[data-tenant-name]').forEach((node) => { node.textContent = tenant.businessName; });
document.querySelectorAll('[data-service-label]').forEach((node) => { node.textContent = node.closest('.eyebrow') ? tenant.serviceLabel.toUpperCase() : tenant.serviceLabel; });
document.querySelector('[data-focus-line]').textContent = tenant.focus;
Object.entries(dashboard.metrics).forEach(([key, value]) => {
  const node = document.querySelector(`[data-metric="${key}"]`);
  if (node) node.textContent = value;
});
document.querySelector('[data-estimate-followup]').textContent = `${dashboard.actions.estimates} need follow-up`;
Object.entries(dashboard.actions).forEach(([key, value]) => {
  document.querySelectorAll(`[data-action-count="${key}"]`).forEach((node) => { node.textContent = value; });
  document.querySelectorAll(`[data-action-value="${key}"]`).forEach((node) => { node.textContent = value; });
});
const toast = document.querySelector('#toast');
const loginDialog = document.querySelector('#login-dialog');
const showToast = (message) => { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); };
document.querySelector('#new-job').addEventListener('click', () => {
  showToast('New job workspace ready to configure.');
});
document.querySelectorAll('.task-list input').forEach((input, taskIndex) => {
  input.checked = dashboard.completedTasks.includes(taskIndex);
  input.closest('label').querySelector('span').classList.toggle('done', input.checked);
  input.addEventListener('change', () => {
    const text = input.closest('label').querySelector('span');
    text.classList.toggle('done', input.checked);
    repository.completeTask(taskIndex, input.checked);
  });
});
document.querySelectorAll('nav a').forEach((link) => {
  link.addEventListener('click', (event) => {
    document.querySelector('nav a.active').classList.remove('active');
    link.classList.add('active');
    if (link.dataset.view) { event.preventDefault(); openRecords(link.dataset.view); }
  });
});
document.querySelector('#workspace-switcher').addEventListener('click', () => loginDialog.showModal());
document.querySelector('#owner-account').addEventListener('click', () => loginDialog.showModal());
document.querySelector('#close-login').addEventListener('click', () => loginDialog.close());
document.querySelector('#demo-login').addEventListener('click', () => { loginDialog.close(); showToast(`Demo session active for ${tenant.businessName}.`); });
document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => { repository.recordAction(button.dataset.action); showToast(`${button.dataset.action} workspace ready to configure.`); });
});
const drawer = document.querySelector('#record-drawer');
const drawerTitle = document.querySelector('#drawer-title');
const recordList = document.querySelector('#record-list');
const recordSearch = document.querySelector('#record-search');
const viewTitles = { customers: 'Customers', leads: 'Lead inbox', estimates: 'Estimates', invoices: 'Invoices', dispatch: 'Dispatch board' };
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const renderRecords = (items, type) => { recordList.innerHTML = items.length ? items.map((item) => `<article class="record-card"><div><span class="record-id">${escapeHtml(item.id || 'RECORD')}</span><h3>${escapeHtml(item.name || item.customer || item.service)}</h3><p>${escapeHtml(item.phone || item.location || item.source || item.technician || item.time || 'No additional detail')}</p>${type === 'dispatch' && item.id?.includes('_job_') ? `<div class="record-actions"><button class="ghost-btn" data-job-action="assign" data-job-id="${escapeHtml(item.id)}" data-job-value="Alex Rivera">Assign Alex</button><button class="ghost-btn" data-job-action="status" data-job-id="${escapeHtml(item.id)}" data-job-value="In progress">Start job</button></div>` : ''}</div><span class="record-status">${escapeHtml(item.status || item.value || item.time || '')}</span></article>`).join('') : '<div class="empty-state">No records match this search.</div>'; };
async function openRecords(type) { drawerTitle.textContent = viewTitles[type] || 'Workspace'; drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); recordSearch.value = ''; try { renderRecords(await repository.list(type), type); } catch { recordList.innerHTML = '<div class="empty-state">Workspace data is unavailable. Check your session or API.</div>'; } }
document.querySelector('#close-drawer').addEventListener('click', () => { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); });
recordList.addEventListener('click', async (event) => { const button = event.target.closest('[data-job-action]'); if (!button) return; button.disabled = true; try { await repository.updateJob(button.dataset.jobId, button.dataset.jobAction, button.dataset.jobValue); showToast('Dispatch updated.'); const active = document.querySelector('nav a.active')?.dataset.view; if (active) openRecords(active); } catch { showToast('Dispatch update unavailable.'); button.disabled = false; } });
document.querySelector('#drawer-refresh').addEventListener('click', () => { const active = document.querySelector('nav a.active')?.dataset.view; if (active) openRecords(active); });
recordSearch.addEventListener('input', async () => { const active = document.querySelector('nav a.active')?.dataset.view; if (!active) return; try { renderRecords(await repository.list(active, recordSearch.value), active); } catch {} });
}
bootstrap();
