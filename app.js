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
document.querySelector('#new-job').addEventListener('click', async () => {
  const customerId = window.prompt('Customer name or ID'); if (!customerId) return;
  const service = window.prompt('Service', tenant.serviceLabel); if (!service) return;
  const time = window.prompt('Schedule time', 'Tomorrow 9:00 AM'); if (!time) return;
  try { await repository.createJob(customerId, service, time); showToast('Job scheduled.'); openRecords('dispatch'); } catch { showToast('Could not schedule job.'); }
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
document.querySelector('#sign-out').addEventListener('click', async () => { await repository.logout(); loginDialog.close(); showToast('Demo session signed out.'); });
document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => { repository.recordAction(button.dataset.action); if (button.dataset.action === 'View service plans') openRecords('plans'); else showToast(`${button.dataset.action} workspace ready to configure.`); });
});
const drawer = document.querySelector('#record-drawer');
const drawerTitle = document.querySelector('#drawer-title');
const recordList = document.querySelector('#record-list');
const recordSearch = document.querySelector('#record-search');
const viewTitles = { customers: 'Customers', leads: 'Lead inbox', estimates: 'Estimates', invoices: 'Invoices', plans: 'Service plans', activities: 'Customer timeline', dispatch: 'Dispatch board', team: 'Team roster', catalog: 'Service catalog' };
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const renderRecords = (items, type) => { recordList.innerHTML = items.length ? items.map((item) => `<article class="record-card"><div><span class="record-id">${escapeHtml(item.id || 'RECORD')}</span><h3>${escapeHtml(item.name || item.customer || item.service)}</h3><p>${escapeHtml(item.phone || item.location || item.source || item.note || item.description || item.technician || item.role || item.time || item.renewal || 'No additional detail')}</p>${type === 'dispatch' && item.id?.includes('_job_') ? `<div class="record-actions"><button class="ghost-btn" data-job-action="assign" data-job-id="${escapeHtml(item.id)}" data-job-value="Alex Rivera">Assign Alex</button><button class="ghost-btn" data-job-action="status" data-job-id="${escapeHtml(item.id)}" data-job-value="In progress">Start job</button></div>` : ''}${type === 'leads' && /_lead_\d{10,}$/.test(item.id || '') && item.status !== 'Converted' ? `<div class="record-actions"><button class="ghost-btn" data-lead-action="convert" data-lead-id="${escapeHtml(item.id)}">Convert to job</button></div>` : ''}${type === 'estimates' && /^EST-\d{13,}$/.test(item.id || '') && item.status === 'Draft' ? `<div class="record-actions"><button class="ghost-btn" data-estimate-action="approve" data-estimate-id="${escapeHtml(item.id)}">Approve estimate</button></div>` : ''}${type === 'estimates' && /^EST-\d{13,}$/.test(item.id || '') && item.status === 'Accepted' ? `<div class="record-actions"><button class="ghost-btn" data-estimate-action="invoice" data-estimate-id="${escapeHtml(item.id)}">Create invoice</button></div>` : ''}${type === 'invoices' && /^INV-\d{13,}$/.test(item.id || '') && item.status === 'Due' ? `<div class="record-actions"><button class="ghost-btn" data-invoice-action="pay" data-invoice-id="${escapeHtml(item.id)}">Record payment</button></div>` : ''}</div><span class="record-status">${escapeHtml(item.status || item.value || item.priceFrom || item.time || '')}</span></article>`).join('') : '<div class="empty-state">No records match this search.</div>'; };
const renderReport = (report) => { recordList.innerHTML = `<div class="report-period">${escapeHtml(report.period)}</div>${report.metrics.map((metric) => `<article class="report-card"><div><span class="record-id">${escapeHtml(metric.label)}</span><h3>${escapeHtml(metric.value)}</h3><p>${escapeHtml(metric.detail)}</p></div></article>`).join('')}`; };
async function openRecords(type) { drawer.dataset.view = type; drawerTitle.textContent = viewTitles[type] || 'Workspace'; drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); recordSearch.value = ''; try { renderRecords(await repository.list(type), type); } catch { recordList.innerHTML = '<div class="empty-state">Workspace data is unavailable. Check your session or API.</div>'; } }
document.querySelector('#close-drawer').addEventListener('click', () => { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); });
document.querySelector('#activity-view').addEventListener('click', async () => { drawer.dataset.view = 'activities'; drawerTitle.textContent = viewTitles.activities; recordSearch.value = ''; try { renderRecords(await repository.list('activities'), 'activities'); } catch { recordList.innerHTML = '<div class="empty-state">Timeline data is unavailable. Check your session or API.</div>'; } });
document.querySelector('#report-view').addEventListener('click', async () => { drawer.dataset.view = 'reports'; drawerTitle.textContent = 'Reports overview'; recordSearch.value = ''; try { renderReport(await repository.getReport()); } catch { recordList.innerHTML = '<div class="empty-state">Reporting data is unavailable. Check your session or API.</div>'; } });
document.querySelector('#team-view').addEventListener('click', () => openRecords('team'));
document.querySelector('#catalog-view').addEventListener('click', () => openRecords('catalog'));
document.querySelector('#log-activity').addEventListener('click', async () => { const customer = window.prompt('Customer name'); if (!customer) return; const note = window.prompt('What happened?'); if (!note) return; try { await repository.logActivity(customer, 'Note', note); showToast('Customer note logged.'); drawerTitle.textContent = viewTitles.activities; renderRecords(await repository.list('activities'), 'activities'); } catch { showToast('Could not log customer note.'); } });
document.querySelector('#add-customer').addEventListener('click', async () => { const name = window.prompt('Customer name'); if (!name) return; const phone = window.prompt('Phone number'); if (!phone) return; const location = window.prompt('Service address', 'Address pending') || 'Address pending'; try { await repository.createCustomer(name, phone, location); showToast('Customer added.'); openRecords('customers'); } catch { showToast('Could not add customer.'); } });
document.querySelector('#add-estimate').addEventListener('click', async () => { const customer = window.prompt('Customer name'); if (!customer) return; let serviceOptions = []; try { serviceOptions = await repository.list('catalog'); } catch {} const defaultService = serviceOptions[0]?.name || tenant.serviceLabel; const service = window.prompt(`Service${serviceOptions.length ? ` (${serviceOptions.map((item) => item.name).join(', ')})` : ''}`, defaultService); if (!service) return; const amount = Number(window.prompt('Estimate amount', '500')); if (!Number.isFinite(amount) || amount <= 0) return; try { await repository.createEstimate(customer, service, amount); showToast('Estimate created.'); openRecords('estimates'); } catch { showToast('Could not create estimate.'); } });
recordList.addEventListener('click', async (event) => { const leadButton = event.target.closest('[data-lead-action]'); if (leadButton) { const time = window.prompt('Schedule time', 'Tomorrow 9:00 AM'); if (!time) return; leadButton.disabled = true; try { await repository.convertLead(leadButton.dataset.leadId, time); showToast('Lead converted to a job.'); openRecords('leads'); } catch { showToast('Lead conversion unavailable.'); leadButton.disabled = false; } return; } const estimateButton = event.target.closest('[data-estimate-action]'); if (estimateButton) { estimateButton.disabled = true; try { if (estimateButton.dataset.estimateAction === 'approve') await repository.updateEstimate(estimateButton.dataset.estimateId, 'approve'); else await repository.createInvoice(estimateButton.dataset.estimateId); showToast(estimateButton.dataset.estimateAction === 'approve' ? 'Estimate approved.' : 'Invoice created.'); openRecords('estimates'); } catch { showToast('Quote-to-cash update unavailable.'); estimateButton.disabled = false; } return; } const invoiceButton = event.target.closest('[data-invoice-action]'); if (invoiceButton) { invoiceButton.disabled = true; try { await repository.payInvoice(invoiceButton.dataset.invoiceId); showToast('Payment recorded.'); openRecords('invoices'); } catch { showToast('Payment update unavailable.'); invoiceButton.disabled = false; } return; } const button = event.target.closest('[data-job-action]'); if (!button) return; button.disabled = true; try { await repository.updateJob(button.dataset.jobId, button.dataset.jobAction, button.dataset.jobValue); showToast('Dispatch updated.'); openRecords('dispatch'); } catch { showToast('Dispatch update unavailable.'); button.disabled = false; } });
document.querySelector('#drawer-refresh').addEventListener('click', async () => { if (drawer.dataset.view === 'reports') { try { renderReport(await repository.getReport()); } catch {} } else if (drawer.dataset.view) openRecords(drawer.dataset.view); });
recordSearch.addEventListener('input', async () => { const active = drawer.dataset.view; if (!active || active === 'reports') return; try { renderRecords(await repository.list(active, recordSearch.value), active); } catch {} });
}
bootstrap();
