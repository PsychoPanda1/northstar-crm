// Demo repository contract. Every read is scoped by tenant slug. Replace this
// adapter with fetch('/api/...') once the authenticated session API exists.
const NORTHSTAR_DEMO_DATA = {
  'johnson-service-co': { metrics: { revenue: '$84,290', jobs: '184', estimates: '32', estimateValue: '$42,680', satisfaction: '4.9', pipeline: '$52,100' }, actions: { estimates: 9, estimateValue: '$12,480', invoices: 7, invoiceValue: '$3,940', renewals: 14 } },
  'clearwater-plumbing': { metrics: { revenue: '$61,840', jobs: '142', estimates: '21', estimateValue: '$28,460', satisfaction: '4.8', pipeline: '$38,720' }, actions: { estimates: 6, estimateValue: '$9,180', invoices: 4, invoiceValue: '$2,860', renewals: 11 } },
  'lowcountry-wash-co': { metrics: { revenue: '$47,290', jobs: '216', estimates: '18', estimateValue: '$16,940', satisfaction: '4.9', pipeline: '$22,180' }, actions: { estimates: 5, estimateValue: '$4,920', invoices: 8, invoiceValue: '$2,140', renewals: 19 } },
  'palmetto-electric': { metrics: { revenue: '$93,480', jobs: '118', estimates: '27', estimateValue: '$64,820', satisfaction: '4.9', pipeline: '$71,440' }, actions: { estimates: 8, estimateValue: '$19,320', invoices: 3, invoiceValue: '$5,280', renewals: 8 } },
  'harbor-shine': { metrics: { revenue: '$39,620', jobs: '284', estimates: '16', estimateValue: '$12,740', satisfaction: '5.0', pipeline: '$18,650' }, actions: { estimates: 4, estimateValue: '$3,180', invoices: 5, invoiceValue: '$1,420', renewals: 26 } }
};

const browserFetch = window.fetch.bind(window);
let activeRepository = null;
const fetch = async (input, init = {}) => {
  const response = await browserFetch(input, init);
  if (response.status !== 401 || !activeRepository || init.__northstarRetry || init.__northstarRefresh) return response;
  const refreshPromise = activeRepository.refreshPromise || (activeRepository.refreshPromise = activeRepository.refreshSession());
  try {
    await refreshPromise;
  } catch {
    return response;
  } finally {
    if (activeRepository.refreshPromise === refreshPromise) activeRepository.refreshPromise = null;
  }
  const headers = new Headers(init.headers || {});
  headers.set('authorization', `Bearer ${activeRepository.token}`);
  return browserFetch(input, { ...init, headers, __northstarRetry: true });
};

class NorthstarDemoRepository {
  constructor(tenant) {
    this.tenant = tenant;
    this.apiAvailable = window.location.protocol !== 'file:';
    this.previewOnly = window.location.protocol === 'file:';
    this.key = `northstar-demo:${tenant.slug}`;
    this.state = this.previewOnly ? JSON.parse(localStorage.getItem(this.key) || '{}') : {};
    if (!this.previewOnly) localStorage.removeItem(this.key);
    this.tokenKey = `northstar-demo-token:${tenant.slug}`;
    this.token = sessionStorage.getItem(this.tokenKey);
    this.authRequired = false;
    activeRepository = this;
    this.ready = this.connect();
  }

  async connect() {
    if (!this.apiAvailable) return;
    try {
      if (!this.token) { const login = await fetch('/api/auth/demo-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: new URLSearchParams(window.location.search).get('service') || 'default' }) }); if (!login.ok) throw new Error('login failed'); this.token = (await login.json()).token; sessionStorage.setItem(this.tokenKey, this.token); }
      const response = await fetch('/api/dashboard', { headers: { authorization: `Bearer ${this.token}` } });
      if (!response.ok) throw new Error('dashboard unavailable');
      this.remote = await response.json();
      const session = await fetch('/api/session', { headers: { authorization: `Bearer ${this.token}` } });
      if (!session.ok) throw new Error('session unavailable');
      this.session = await session.json();
      if (this.session.expiresAt && this.session.expiresAt - Date.now() < 30 * 60 * 1000) await this.refreshSession();
    } catch { this.remote = null; this.session = null; this.authRequired = !this.previewOnly; }
  }

  async login(email, password) {
    if (!this.apiAvailable) throw new Error('api unavailable');
    const service = new URLSearchParams(window.location.search).get('service') || 'default';
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, service }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'login failed');
    const result = await response.json(); this.token = result.token; sessionStorage.setItem(this.tokenKey, this.token); return result;
  }

  async loginWithOidcToken(idToken) {
    if (!this.apiAvailable) throw new Error('api unavailable');
    const response = await fetch('/api/auth/oidc', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'identity login failed');
    const result = await response.json(); this.token = result.token; sessionStorage.setItem(this.tokenKey, this.token); return result;
  }

  async refreshSession() {
    if (!this.apiAvailable || !this.token) throw new Error('session unavailable');
    const response = await fetch('/api/auth/refresh', { method: 'POST', headers: { authorization: `Bearer ${this.token}` }, __northstarRefresh: true });
    if (!response.ok) throw new Error('session refresh failed');
    const result = await response.json();
    this.token = result.token;
    sessionStorage.setItem(this.tokenKey, this.token);
    this.session = { owner: result.owner, tenant: result.tenant, permissions: result.permissions, expiresAt: result.expiresAt };
    return result;
  }

  getDashboard() {
    if (this.remote) return this.remote;
    if (!this.previewOnly) throw new Error('authenticated dashboard required');
    const seed = NORTHSTAR_DEMO_DATA[this.tenant.slug] || NORTHSTAR_DEMO_DATA['johnson-service-co'];
    return { ...seed, completedTasks: this.state.completedTasks || [] };
  }

  async list(type, search = '', filters = {}) {
    if (!this.remote) return [];
    const pageSize = 200;
    const items = [];
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= 500) {
      const result = await this.listPage(type, { search, ...filters, page, pageSize });
      items.push(...(Array.isArray(result.items) ? result.items : []));
      hasMore = result.hasMore === true;
      page += 1;
    }
    return items;
  }

  async listPage(type, { search = '', status = '', priority = '', assignedTo = '', source = '', page = 1, pageSize = 50 } = {}) {
    if (!this.remote) return { items: [], total: 0, page, pageSize, hasMore: false };
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) query.set('search', search);
    if (status) query.set('status', status);
    if (priority) query.set('priority', priority);
    if (assignedTo) query.set('assignedTo', assignedTo);
    if (source) query.set('source', source);
    const response = await fetch(`/api/${type}?${query}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('records unavailable');
    return response.json();
  }

  async listDispatchForDate(date) {
    if (!this.remote) throw new Error('API required for dated dispatch');
    const response = await fetch(`/api/dispatch?date=${encodeURIComponent(date)}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('dated dispatch unavailable');
    return response.json();
  }

  async listDispatchForRange(startDate, endDate) {
    if (!this.remote) throw new Error('API required for dispatch planning');
    const response = await fetch(`/api/dispatch?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('dispatch planning unavailable');
    return response.json();
  }

  async getDispatchCapacity(date, technician = '') {
    if (!this.remote) throw new Error('API required for dispatch capacity');
    const params = new URLSearchParams({ date });
    if (technician) params.set('technician', technician);
    const response = await fetch(`/api/dispatch/capacity?${params}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('dispatch capacity unavailable');
    return response.json();
  }

  async setDispatchCapacity(date, technician, targetMinutes, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for dispatch capacity');
    const response = await fetch('/api/dispatch/capacity', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ date, technician, targetMinutes }) });
    if (!response.ok) throw new Error('dispatch capacity update failed');
    return response.json();
  }

  async getReport() {
    if (!this.remote) throw new Error('API required for reporting');
    const response = await fetch('/api/reports/overview', { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('report unavailable');
    return response.json();
  }

  async getCustomReport(metrics = []) {
    if (!this.remote) throw new Error('API required for custom reporting');
    const query = new URLSearchParams(); (Array.isArray(metrics) ? metrics : []).slice(0, 20).forEach((metric) => query.append('metric', metric));
    const response = await fetch(`/api/reports/custom${query.toString() ? `?${query}` : ''}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('custom report unavailable');
    return response.json();
  }

  async getMarketingReport() {
    if (!this.remote) throw new Error('API required for marketing reporting');
    const response = await fetch('/api/reports/marketing', { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('marketing report unavailable');
    return response.json();
  }

  async getReceivablesReport() {
    if (!this.remote) throw new Error('API required for receivables reporting');
    const response = await fetch('/api/reports/receivables', { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('receivables report unavailable');
    return response.json();
  }

  async getTechnicianReport() {
    if (!this.remote) throw new Error('API required for technician reporting');
    const response = await fetch('/api/reports/technicians', { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('technician report unavailable');
    return response.json();
  }

  async getPayrollReport(startDate = '', endDate = '') {
    if (!this.remote) throw new Error('API required for payroll reporting');
    const query = new URLSearchParams(); if (startDate) query.set('startDate', startDate); if (endDate) query.set('endDate', endDate);
    const response = await fetch(`/api/reports/payroll${query.toString() ? `?${query}` : ''}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('payroll report unavailable');
    return response.json();
  }

  async getIntegrationHealth() {
    if (!this.remote) throw new Error('API required for integration health');
    const response = await fetch('/api/integrations/health', { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('integration health unavailable');
    return response.json();
  }

  async exportRecords(type, range = {}) {
    if (!this.remote) throw new Error('API required for exports');
    const query = new URLSearchParams({ type, ...(range.startDate ? { startDate: range.startDate } : {}), ...(range.endDate ? { endDate: range.endDate } : {}) });
    const response = await fetch(`/api/export?${query}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('export unavailable');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = type === 'tenant-snapshot' ? 'northstar-tenant-snapshot.json' : `northstar-${type}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async validateTenantSnapshot(snapshot) {
    if (!this.remote) throw new Error('API required for snapshot validation');
    const response = await fetch('/api/import/tenant-snapshot/validate', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify(snapshot) });
    if (!response.ok) throw new Error('snapshot validation unavailable');
    return response.json();
  }

  async importTenantSnapshot(snapshot, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for snapshot import');
    const response = await fetch('/api/import/tenant-snapshot', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify(snapshot) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'snapshot import failed');
    return response.json();
  }

  async markNotificationRead(id) {
    if (!this.remote) throw new Error('API required for notification state');
    const response = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'POST', headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('notification update failed');
    return response.json();
  }

  async resolveRequest(id, note, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for request resolution');
    const response = await fetch(`/api/requests/${encodeURIComponent(id)}/resolve`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ note }) });
    if (!response.ok) throw new Error('request resolution failed');
    return response.json();
  }

  async replyToRequest(id, channel, message, idempotencyKey) {
    if (!this.remote) throw new Error('API required for request replies');
    const response = await fetch(`/api/requests/${encodeURIComponent(id)}/reply`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey || `request-reply-${Date.now()}` }, body: JSON.stringify({ channel, message }) });
    if (!response.ok) throw new Error('request reply failed');
    return response.json();
  }

  async updateRequestPriority(id, priority, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for request priority updates');
    const response = await fetch(`/api/requests/${encodeURIComponent(id)}/priority`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ priority }) });
    if (!response.ok) throw new Error('request priority update failed');
    return response.json();
  }

  async assignRequest(id, assignedTo, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for request assignment');
    const response = await fetch(`/api/requests/${encodeURIComponent(id)}/assign`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ assignedTo }) });
    if (!response.ok) throw new Error('request assignment failed');
    return response.json();
  }

  async updateRequestStatus(id, status, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for request status updates');
    const response = await fetch(`/api/requests/${encodeURIComponent(id)}/status`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ status }) });
    if (!response.ok) throw new Error('request status update failed');
    return response.json();
  }

  async convertRequest(id, time, service, appointment = {}, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for request conversion');
    const response = await fetch(`/api/requests/${encodeURIComponent(id)}/convert`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ time, service, ...(appointment.slotId ? { slotId: appointment.slotId } : {}), ...(appointment.locationId ? { locationId: appointment.locationId } : {}), ...(appointment.startsAt ? { startsAt: appointment.startsAt } : {}), ...(appointment.endsAt ? { endsAt: appointment.endsAt } : {}) }) });
    if (!response.ok) throw new Error('request conversion failed');
    return response.json();
  }

  async bulkAssignRequests(requestIds, assignedTo, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for request assignment');
    const response = await fetch('/api/requests/bulk-assign', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ requestIds, assignedTo }) });
    if (!response.ok) throw new Error('bulk request assignment failed');
    return response.json();
  }

  async bulkUpdateRequestPriority(requestIds, priority, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for request priority updates');
    const response = await fetch('/api/requests/bulk-priority', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ requestIds, priority }) });
    if (!response.ok) throw new Error('bulk request priority update failed');
    return response.json();
  }

  async bulkUpdateRequestStatus(requestIds, status = 'In progress', idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for request status updates');
    const response = await fetch('/api/requests/bulk-status', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ requestIds, status }) });
    if (!response.ok) throw new Error('request status update failed');
    return response.json();
  }

  async bulkResolveRequests(requestIds, note, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for request resolution');
    const response = await fetch('/api/requests/bulk-resolve', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ requestIds, note }) });
    if (!response.ok) throw new Error('bulk request resolution failed');
    return response.json();
  }

  completeTask(taskIndex, completed) {
    const completedTasks = new Set(this.state.completedTasks || []);
    completed ? completedTasks.add(taskIndex) : completedTasks.delete(taskIndex);
    this.state.completedTasks = [...completedTasks];
    if (this.previewOnly) localStorage.setItem(this.key, JSON.stringify(this.state));
    if (this.remote) fetch(`/api/tasks/${taskIndex}`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ completed }) }).catch(() => {});
  }

  recordAction(action) {
    this.state.lastAction = { action, at: new Date().toISOString() };
    if (this.previewOnly) localStorage.setItem(this.key, JSON.stringify(this.state));
    if (this.remote) fetch('/api/actions', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ action }) }).catch(() => {});
  }

  async updateJob(id, action, value) {
    if (!this.remote) throw new Error('API required for dispatch updates');
    const body = action === 'assign' ? { technician: value } : action === 'reschedule' ? { time: value } : { status: value };
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/${action}`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error('job update failed');
    return response.json();
  }

  async bulkAssignJobs(jobIds, technician) {
    if (!this.remote) throw new Error('API required for bulk dispatch assignment');
    const response = await fetch('/api/dispatch/bulk-assign', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ jobIds, technician }) });
    if (!response.ok) throw new Error('bulk assignment failed');
    return response.json();
  }

  async bulkUpdateJobStatus(jobIds, status, note = '', idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for bulk dispatch status');
    const response = await fetch('/api/dispatch/bulk-status', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ jobIds, status, ...(note ? { note } : {}) }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'bulk status update failed');
    return response.json();
  }

  async updateJobPriority(id, priority) {
    if (!this.remote) throw new Error('API required for job priority updates');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/priority`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ priority }) });
    if (!response.ok) throw new Error('job priority update failed');
    return response.json();
  }

  async rescheduleJob(id, slotId) {
    if (!this.remote) throw new Error('API required for dispatch rescheduling');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/reschedule`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ slotId }) });
    if (!response.ok) throw new Error('job reschedule failed');
    return response.json();
  }

  async rebookJob(id, slotId) {
    if (!this.remote) throw new Error('API required for dispatch rebooking');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/rebook`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ slotId }) });
    if (!response.ok) throw new Error('job rebook failed');
    return response.json();
  }

  async markJobNoShow(id, reason) {
    if (!this.remote) throw new Error('API required for no-show updates');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/no-show`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ reason }) });
    if (!response.ok) throw new Error('no-show update failed');
    return response.json();
  }

  async addJobVisit(id, time, technician = '', appointment = {}) {
    if (!this.remote) throw new Error('API required for multi-visit scheduling');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/visits`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ time, ...(technician ? { technician } : {}) }) });
    if (!response.ok) throw new Error('job visit creation failed');
    return response.json();
  }

  async updateJobVisitStatus(jobId, visitId, status) {
    if (!this.remote) throw new Error('API required for visit status updates');
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/visits/${encodeURIComponent(visitId)}/status`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
    if (!response.ok) throw new Error('visit status update failed');
    return response.json();
  }

  async listJobVisits(jobId) {
    if (!this.remote) throw new Error('API required for visit listing');
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/visits`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('visit listing failed');
    return response.json();
  }

  async notifyJob(id, template, channel = 'SMS') {
    if (!this.remote) throw new Error('API required for job notifications');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/notify`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ template, channel }) });
    if (!response.ok) throw new Error('job notification failed');
    return response.json();
  }

  async remindJob(id, channel = 'SMS') {
    if (!this.remote) throw new Error('API required for appointment reminders');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/remind`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ channel }) });
    if (!response.ok) throw new Error('appointment reminder failed');
    return response.json();
  }

  async remindUpcomingJobs(hours = 24, channel = 'SMS') {
    if (!this.remote) throw new Error('API required for appointment reminders');
    const response = await fetch('/api/dispatch/reminders', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ hours, channel }) });
    if (!response.ok) throw new Error('upcoming appointment reminders failed');
    return response.json();
  }

  async runAutomations(options = {}, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for customer automations');
    const response = await fetch('/api/automations/run', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify(options) });
    if (!response.ok) throw new Error('customer automation run failed');
    return response.json();
  }

  async downloadJobCalendar(id) {
    if (!this.remote) throw new Error('API required for calendar export');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/calendar`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('job calendar unavailable');
    return response.blob();
  }

  async getRouteManifest(date = '', technician = '') {
    if (!this.remote) throw new Error('API required for route manifest');
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (technician) params.set('technician', technician);
    const response = await fetch(`/api/dispatch/route-manifest?${params}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('route manifest unavailable');
    return response.json();
  }

  async getRouteSummary(date = '', technician = '') {
    if (!this.remote) throw new Error('API required for route summary');
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (technician) params.set('technician', technician);
    const response = await fetch(`/api/dispatch/route-summary?${params}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('route summary unavailable');
    return response.json();
  }

  async updateRouteOrder(date, technician, jobIds, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for route ordering');
    const response = await fetch('/api/dispatch/route-order', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ date, technician, jobIds }) });
    if (!response.ok) throw new Error('route ordering failed');
    return response.json();
  }

  async optimizeRoute(date, technician, startLatitude, startLongitude, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for route optimization');
    const response = await fetch('/api/dispatch/route-optimize', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ date, technician, ...(startLatitude !== undefined ? { startLatitude, startLongitude } : {}) }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'route optimization failed');
    return response.json();
  }

  async getInvoiceReceipt(id) {
    if (!this.remote) throw new Error('API required for invoice receipt');
    const response = await fetch(`/api/invoices/${encodeURIComponent(id)}/receipt`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('invoice receipt unavailable');
    return response.json();
  }

  async downloadRouteCalendar(date = '', technician = '') {
    if (!this.remote) throw new Error('API required for route calendar');
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (technician) params.set('technician', technician);
    const response = await fetch(`/api/dispatch/route-calendar?${params}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('route calendar unavailable');
    return { blob: await response.blob(), filename: response.headers.get('content-disposition')?.match(/filename="([^"]+)/)?.[1] || 'northstar-route.ics' };
  }

  async getAvailability(service = '', days = 7, catalogItemId = '') {
    if (!this.remote) throw new Error('API required for availability');
    const params = new URLSearchParams({ days: String(days), ...(catalogItemId ? { catalogItemId } : {}) });
    if (service) params.set('service', service);
    const response = await fetch(`/api/public/availability?${params}`);
    if (!response.ok) throw new Error('availability unavailable');
    return response.json();
  }

  async recommendTechnicians(jobId) {
    if (!this.remote) throw new Error('API required for dispatch recommendations');
    const response = await fetch(`/api/dispatch/recommendations?jobId=${encodeURIComponent(jobId)}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('dispatch recommendations unavailable');
    return response.json();
  }

  async retryPaymentIntent(id, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for payment retry');
    const response = await fetch(`/api/payment-intents/${encodeURIComponent(id)}/retry`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'idempotency-key': idempotencyKey } });
    if (!response.ok) throw new Error('payment retry failed');
    return response.json();
  }

  async refundPayment(id, amount, reason = '', idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for payment refunds');
    const response = await fetch(`/api/payments/${encodeURIComponent(id)}/refund`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ ...(amount !== undefined ? { amount } : {}), ...(reason ? { reason } : {}) }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'payment refund failed');
    return response.json();
  }

  async retryMessage(id, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for message retry');
    const response = await fetch(`/api/messages/${encodeURIComponent(id)}/retry`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'idempotency-key': idempotencyKey } });
    if (!response.ok) throw new Error('message retry failed');
    return response.json();
  }

  async dispatchMessages(limit = 20) {
    if (!this.remote) throw new Error('API required for message dispatch');
    const response = await fetch('/api/integrations/messages/dispatch', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ limit }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'message dispatch failed');
    return response.json();
  }

  async dispatchPayments(limit = 20) {
    if (!this.remote) throw new Error('API required for payment dispatch');
    const response = await fetch('/api/integrations/payments/dispatch', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ limit }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'payment dispatch failed');
    return response.json();
  }

  async getJobDetail(id) {
    if (!this.remote) throw new Error('API required for job detail');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('job detail unavailable');
    return response.json();
  }

  async getJobLocationHistory(id) {
    if (!this.remote) throw new Error('API required for location history');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/location-history`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('job location history unavailable');
    return response.json();
  }

  async addJobNote(id, note, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for job notes');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/notes`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ note }) });
    if (!response.ok) throw new Error('job note failed');
    return response.json();
  }

  async linkJobAsset(id, assetId, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for job assets');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/asset`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ assetId }) });
    if (!response.ok) throw new Error('job asset link failed');
    return response.json();
  }

  async completeJob(id, note) {
    if (!this.remote) throw new Error('API required for job completion');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/complete`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ note }) });
    if (!response.ok) throw new Error('job completion failed');
    return response.json();
  }

  async technicianLink(id, technician = '') {
    if (!this.remote) throw new Error('API required for technician links');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/technician-link`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify(technician ? { technician } : {}) });
    if (!response.ok) throw new Error('technician link unavailable');
    return response.json();
  }

  async customerLink(id) {
    if (!this.remote) throw new Error('API required for customer links');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/customer-link`, { method: 'POST', headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('customer link unavailable');
    return response.json();
  }

  async reviewLink(id) {
    if (!this.remote) throw new Error('API required for review links');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/review-link`, { method: 'POST', headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('review link unavailable');
    return response.json();
  }

  async requestReview(id, channel = 'SMS') {
    if (!this.remote) throw new Error('API required for review requests');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/review-request`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ channel }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'review request unavailable');
    return response.json();
  }

  async logActivity(customer, channel, note, customerId = '', idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for activity logging');
    const response = await fetch('/api/activities', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ ...(customerId ? { customerId } : { customer }), channel, note }) });
    if (!response.ok) throw new Error('activity logging failed');
    return response.json();
  }

  async sendMessage(customer, channel, message, customerId = '', idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for messages');
    const response = await fetch('/api/messages', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ ...(customerId ? { customerId } : { customer }), channel, message }) });
    if (!response.ok) throw new Error('message queue failed');
    return response.json();
  }

  async queueReactivation(inactiveDays = 180, channel = 'SMS', tag = '') {
    if (!this.remote) throw new Error('API required for reactivation campaigns');
    const response = await fetch('/api/customers/reactivation', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ inactiveDays, channel, ...(tag ? { tag } : {}) }) });
    if (!response.ok) throw new Error('reactivation campaign failed');
    return response.json();
  }

  async replyToMessage(messageId, message, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for message replies');
    const response = await fetch(`/api/messages/${encodeURIComponent(messageId)}/reply`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ message }) });
    if (!response.ok) throw new Error('message reply failed');
    return response.json();
  }

  async convertLead(id, time, idempotencyKey = '', slotId = '', locationId = '') {
    if (!this.remote) throw new Error('API required for lead conversion');
    const response = await fetch(`/api/leads/${encodeURIComponent(id)}/convert`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}) }, body: JSON.stringify({ time, ...(slotId ? { slotId } : {}), ...(locationId ? { locationId } : {}) }) });
    if (!response.ok) throw new Error('lead conversion failed');
    return response.json();
  }

  async updateLeadStatus(id, status, note = '', idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for lead status updates');
    const response = await fetch(`/api/leads/${encodeURIComponent(id)}/status`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ status, ...(note ? { note } : {}) }) });
    if (!response.ok) throw new Error('lead status update failed');
    return response.json();
  }

  async bulkUpdateLeadStatus(leadIds, status, note = '', idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for bulk lead status updates');
    const response = await fetch('/api/leads/bulk-status', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ leadIds, status, ...(note ? { note } : {}) }) });
    if (!response.ok) throw new Error('bulk lead status update failed');
    return response.json();
  }

  async bulkAssignLeads(leadIds, assignedTo, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for bulk lead assignment');
    const response = await fetch('/api/leads/bulk-assign', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ leadIds, assignedTo }) });
    if (!response.ok) throw new Error('bulk lead assignment failed');
    return response.json();
  }

  async createCustomer(name, phone, location, email = '') {
    if (!this.remote) throw new Error('API required for customer creation');
    const response = await fetch('/api/customers', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ name, phone, location, ...(email ? { email } : {}) }) });
    if (!response.ok) throw new Error('customer creation failed');
    return response.json();
  }

  async importCustomers(customers, { dryRun = false, idempotencyKey = crypto.randomUUID() } = {}) {
    if (!this.remote) throw new Error('API required for customer import');
    const response = await fetch('/api/customers/import', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ customers, dryRun }) });
    if (!response.ok) throw new Error('customer import failed');
    return response.json();
  }

  async createAsset(customer, name, serial, installed, warrantyThrough, customerId = '', nextServiceDue = '') {
    if (!this.remote) throw new Error('API required for asset creation');
    const response = await fetch('/api/assets', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ ...(customerId ? { customerId } : { customer }), name, serial, installed, warrantyThrough, ...(nextServiceDue ? { nextServiceDue } : {}) }) });
    if (!response.ok) throw new Error('asset creation failed');
    return response.json();
  }

  async importAssets(assets, { dryRun = false, idempotencyKey = crypto.randomUUID() } = {}) {
    if (!this.remote) throw new Error('API required for asset import');
    const response = await fetch('/api/assets/import', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ assets, dryRun }) });
    if (!response.ok) throw new Error('asset import failed');
    return response.json();
  }

  async updateAsset(id, fields, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for asset updates');
    const response = await fetch(`/api/assets/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify(fields) });
    if (!response.ok) throw new Error('asset update failed');
    return response.json();
  }

  async createCatalogItem(name, description, priceFrom, idempotencyKey = crypto.randomUUID(), category = 'General', durationMinutes = 60, taxable = true, checklist = '') {
    if (!this.remote) throw new Error('API required for catalog editing');
    const response = await fetch('/api/catalog', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ name, description, priceFrom, category, durationMinutes, taxable }) });
    if (!response.ok) throw new Error('catalog item creation failed');
    return response.json();
  }

  async updateCatalogItem(id, fields, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for catalog editing');
    const response = await fetch(`/api/catalog/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify(fields) });
    if (!response.ok) throw new Error('catalog item update failed');
    return response.json();
  }

  async assignLead(id, assignedTo, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for lead assignment');
    const response = await fetch(`/api/leads/${encodeURIComponent(id)}/assign`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ assignedTo }) });
    if (!response.ok) throw new Error('lead assignment failed');
    return response.json();
  }

  async contactLead(id, channel = 'SMS', message = '', idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for lead contact');
    const response = await fetch(`/api/leads/${encodeURIComponent(id)}/contact`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ channel, message }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'lead contact failed');
    return response.json();
  }

  async createMaterial(name, sku, unit, unitCost, onHand, reorderPoint, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for material creation');
    const response = await fetch('/api/materials', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ name, sku, unit, unitCost, onHand, reorderPoint }) });
    if (!response.ok) throw new Error('material creation failed');
    return response.json();
  }

  async setMaterialBarcode(materialId, barcode, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for material barcode updates');
    const response = await fetch(`/api/materials/${encodeURIComponent(materialId)}/barcode`, { method: 'PATCH', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ barcode }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'material barcode update failed');
    return response.json();
  }

  async lookupMaterial(code) {
    if (!this.remote) throw new Error('API required for material lookup');
    const response = await fetch(`/api/materials/lookup?code=${encodeURIComponent(code)}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'material lookup failed');
    return response.json();
  }

  async listInventoryLocations() {
    if (!this.remote) throw new Error('API required for inventory locations');
    const response = await fetch('/api/inventory-locations', { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('inventory locations unavailable');
    return response.json();
  }

  async createInventoryLocation(name, type = 'Warehouse', idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for inventory locations');
    const response = await fetch('/api/inventory-locations', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ name, type }) });
    if (!response.ok) throw new Error('inventory location creation failed');
    return response.json();
  }

  async transferInventory(destinationLocationId, materialId, fromLocationId, quantity, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for inventory transfers');
    const response = await fetch(`/api/inventory-locations/${encodeURIComponent(destinationLocationId)}/transfer`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ materialId, fromLocationId, quantity }) });
    if (!response.ok) throw new Error('inventory transfer failed');
    return response.json();
  }

  async adjustInventory(materialId, locationId, countedQuantity, reason, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for inventory adjustments');
    const response = await fetch(`/api/materials/${encodeURIComponent(materialId)}/adjust`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ locationId, countedQuantity, reason }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'inventory adjustment failed');
    return response.json();
  }

  async consumeMaterial(jobId, materialId, quantity, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for material usage');
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/materials`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ materialId, quantity }) });
    if (!response.ok) throw new Error('material usage failed');
    return response.json();
  }

  async logLabor(jobId, technician, hours, hourlyRate, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for labor logging');
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/labor`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ technician, hours, hourlyRate }) });
    if (!response.ok) throw new Error('labor logging failed');
    return response.json();
  }

  async createPurchaseOrder(materialId, vendor, quantity, unitCost, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for purchase orders');
    const response = await fetch('/api/purchase-orders', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ materialId, vendor, quantity, unitCost }) });
    if (!response.ok) throw new Error('purchase order creation failed');
    return response.json();
  }

  async receivePurchaseOrder(id, quantity = null, idempotencyKey = crypto.randomUUID(), locationId = '') {
    if (!this.remote) throw new Error('API required for purchase order receiving');
    const body = { ...(quantity === null ? {} : { quantity }), ...(locationId ? { locationId } : {}) };
    const response = await fetch(`/api/purchase-orders/${encodeURIComponent(id)}/receive`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error('purchase order receiving failed');
    return response.json();
  }

  async matchPurchaseOrder(id, invoiceNumber, quantity, unitCost, vendor = '') {
    if (!this.remote) throw new Error('API required for purchasing');
    const response = await fetch(`/api/purchase-orders/${encodeURIComponent(id)}/match`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ invoiceNumber, quantity, unitCost, ...(vendor ? { vendor } : {}) }) });
    if (!response.ok) throw new Error('purchase order matching failed');
    return response.json();
  }

  async approvePurchaseOrder(id, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for purchase order approval');
    const response = await fetch(`/api/purchase-orders/${encodeURIComponent(id)}/approve`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: '{}' });
    if (!response.ok) throw new Error('purchase order approval failed');
    return response.json();
  }

  async approvePurchaseOrders(orderIds, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for purchase order approval');
    const response = await fetch('/api/purchase-orders/approve-bulk', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ orderIds }) });
    if (!response.ok) throw new Error('purchase order batch approval failed');
    return response.json();
  }

  async renewPlan(id, time, slotId = null, idempotencyKey = '', locationId = '') {
    if (!this.remote) throw new Error('API required for plan renewal');
    const response = await fetch(`/api/plans/${encodeURIComponent(id)}/renew`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}) }, body: JSON.stringify({ time, ...(slotId ? { slotId } : {}), ...(locationId ? { locationId } : {}) }) });
    if (!response.ok) throw new Error('plan renewal failed');
    return response.json();
  }

  async schedulePlanVisits(id, firstStartsAt, time, visits = 3, frequency = 'Monthly', firstEndsAt = '', locationId = '', idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for recurring plan scheduling');
    const response = await fetch(`/api/plans/${encodeURIComponent(id)}/schedule`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ firstStartsAt, ...(firstEndsAt ? { firstEndsAt } : {}), time, visits, frequency, ...(locationId ? { locationId } : {}) }) });
    if (!response.ok) throw new Error('recurring plan scheduling failed');
    return response.json();
  }

  async remindPlans(days = 30, channel = 'SMS') {
    if (!this.remote) throw new Error('API required for plan reminders');
    const response = await fetch('/api/plans/reminders', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ days, channel }) });
    if (!response.ok) throw new Error('plan reminders failed');
    return response.json();
  }

  async createPlan(customerId, service, amount, renewal, idempotencyKey = crypto.randomUUID(), assetId = '') {
    if (!this.remote) throw new Error('API required for service plan creation');
    const response = await fetch('/api/plans', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ customerId, service, amount, renewal, ...(assetId ? { assetId } : {}) }) });
    if (!response.ok) throw new Error('service plan creation failed');
    return response.json();
  }

  async updatePlanStatus(id, action, note = '') {
    if (!this.remote) throw new Error('API required for service plan status updates');
    const response = await fetch(`/api/plans/${encodeURIComponent(id)}/${action}`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ ...(note ? { note } : {}) }) });
    if (!response.ok) throw new Error('service plan status update failed');
    return response.json();
  }

  async createPlanInvoice(id, period, due = 'Due on receipt', idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for plan billing');
    const response = await fetch(`/api/plans/${encodeURIComponent(id)}/invoice`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ period, due }) });
    if (!response.ok) throw new Error('plan invoice creation failed');
    return response.json();
  }

  async billPlanCycle(period, due = 'Due on receipt', idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for plan billing');
    const response = await fetch('/api/plans/billing-cycle', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ period, due }) });
    if (!response.ok) throw new Error('plan billing cycle failed');
    return response.json();
  }

  async getCustomerProfile(id) {
    if (!this.remote) throw new Error('API required for customer profiles');
    const response = await fetch(`/api/customers/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('customer profile unavailable');
    return response.json();
  }

  async getCustomerTimeline(id, limit = 100) {
    if (!this.remote) throw new Error('API required for customer timelines');
    const response = await fetch(`/api/customers/${encodeURIComponent(id)}/timeline?limit=${encodeURIComponent(limit)}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('customer timeline unavailable');
    return response.json();
  }

  async updateCustomer(id, fields, idempotencyKey = '') {
    if (!this.remote) throw new Error('API required for customer profile updates');
    const response = await fetch(`/api/customers/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}) }, body: JSON.stringify(fields) });
    if (!response.ok) throw new Error('customer profile update failed');
    return response.json();
  }

  async mergeCustomer(targetCustomerId, mergeCustomerId, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for customer merge');
    const response = await fetch(`/api/customers/${encodeURIComponent(targetCustomerId)}/merge`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ mergeCustomerId }) });
    if (!response.ok) throw new Error('customer merge failed');
    return response.json();
  }

  async createLocation(customerId, label, address, idempotencyKey = '') {
    if (!this.remote) throw new Error('API required for locations');
    const response = await fetch(`/api/customers/${encodeURIComponent(customerId)}/locations`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}) }, body: JSON.stringify({ label, address }) });
    if (!response.ok) throw new Error('location creation failed');
    return response.json();
  }

  async updateCustomerTags(customerId, tags, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for customer tags');
    const response = await fetch(`/api/customers/${encodeURIComponent(customerId)}/tags`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ tags }) });
    if (!response.ok) throw new Error('customer tag update failed');
    return response.json();
  }

  async updateCustomerPreferences(customerId, preferences) {
    if (!this.remote) throw new Error('API required for customer contact preferences');
    const response = await fetch(`/api/customers/${encodeURIComponent(customerId)}/preferences`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify(preferences) });
    if (!response.ok) throw new Error('customer contact preferences update failed');
    return response.json();
  }

  async createJob(customerId, service, time, appointment = {}) {
    if (!this.remote) throw new Error('API required for job creation');
    const response = await fetch('/api/jobs', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ customerId, service, time, ...(appointment.locationId ? { locationId: appointment.locationId } : {}), ...(appointment.slotId ? { slotId: appointment.slotId } : {}), ...(appointment.requiredSkill ? { requiredSkill: appointment.requiredSkill } : {}), ...(appointment.startsAt ? { startsAt: appointment.startsAt } : {}), ...(appointment.endsAt ? { endsAt: appointment.endsAt } : {}), ...(appointment.timeZone ? { timeZone: appointment.timeZone } : {}) }) });
    if (!response.ok) throw new Error('job creation failed');
    return response.json();
  }

  async updateJobChecklist(jobId, items) {
    if (!this.remote) throw new Error('API required for checklist management');
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/checklist`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ items }) });
    if (!response.ok) throw new Error('job checklist update failed');
    return response.json();
  }

  async setJobFormRequirements(jobId, formNames) {
    if (!this.remote) throw new Error('API required for form requirements');
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/form-requirements`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ formNames }) });
    if (!response.ok) throw new Error('job form requirements update failed');
    return response.json();
  }

  async listVehicles() {
    if (!this.remote) throw new Error('API required for fleet');
    const response = await fetch('/api/vehicles', { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('vehicle list failed');
    return response.json();
  }

  async listVehicleLocations() {
    if (!this.remote) throw new Error('API required for fleet locations');
    const response = await fetch('/api/vehicles/locations', { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('vehicle locations unavailable');
    return response.json();
  }

  async createVehicle(name, makeModel, licensePlate, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for fleet');
    const response = await fetch('/api/vehicles', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ name, makeModel, licensePlate }) });
    if (!response.ok) throw new Error('vehicle creation failed');
    return response.json();
  }

  async assignJobVehicle(jobId, vehicleId) {
    if (!this.remote) throw new Error('API required for fleet');
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/vehicle`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ vehicleId }) });
    if (!response.ok) throw new Error('vehicle assignment failed');
    return response.json();
  }

  async assignJobCrew(jobId, technicians) {
    if (!this.remote) throw new Error('API required for crew management');
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/crew`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ technicians }) });
    if (!response.ok) throw new Error('job crew assignment failed');
    return response.json();
  }

  async updateVehicleStatus(vehicleId, status) {
    if (!this.remote) throw new Error('API required for fleet');
    const response = await fetch(`/api/vehicles/${encodeURIComponent(vehicleId)}/status`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
    if (!response.ok) throw new Error('vehicle status update failed');
    return response.json();
  }

  async updateVehicleMaintenance(vehicleId, nextServiceDue, odometer = null, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for fleet maintenance');
    const response = await fetch(`/api/vehicles/${encodeURIComponent(vehicleId)}`, { method: 'PATCH', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ nextServiceDue, ...(odometer === null ? {} : { odometer }) }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'vehicle maintenance update failed');
    return response.json();
  }

  async createTeamMember(name, role, skills = [], idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for team management');
    const response = await fetch('/api/team', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ name, role, skills }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'team member creation failed');
    return response.json();
  }

  async listUsers() {
    if (!this.remote) throw new Error('API required for user management');
    const response = await fetch('/api/users', { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('user listing failed');
    return response.json();
  }

  async createUser(name, email, password, role, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for user management');
    const response = await fetch('/api/users', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ name, email, password, role }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'user creation failed');
    return response.json();
  }

  async updateUserStatus(id, status) {
    if (!this.remote) throw new Error('API required for user management');
    const response = await fetch(`/api/users/${encodeURIComponent(id)}/status`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
    if (!response.ok) throw new Error('user status update failed');
    return response.json();
  }

  async resetUserPassword(id, password) {
    if (!this.remote) throw new Error('API required for user management');
    const response = await fetch(`/api/users/${encodeURIComponent(id)}/password`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'user password reset failed');
    return response.json();
  }

  async listTeamTimeOff(teamMemberId) {
    if (!this.remote) throw new Error('API required for time-off management');
    const response = await fetch(`/api/team/${encodeURIComponent(teamMemberId)}/time-off`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('time-off listing failed');
    return response.json();
  }

  async createTeamTimeOff(teamMemberId, startsAt, endsAt, reason, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for time-off management');
    const response = await fetch(`/api/team/${encodeURIComponent(teamMemberId)}/time-off`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ startsAt, endsAt, reason }) });
    if (!response.ok) throw new Error('time-off creation failed');
    return response.json();
  }

  async cancelTeamTimeOff(teamMemberId, timeOffId, note = '') {
    if (!this.remote) throw new Error('API required for time-off management');
    const response = await fetch(`/api/team/${encodeURIComponent(teamMemberId)}/time-off/${encodeURIComponent(timeOffId)}/cancel`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ note }) });
    if (!response.ok) throw new Error('time-off cancellation failed');
    return response.json();
  }

  async setTeamCommissionRate(teamMemberId, commissionRate, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for commission rates');
    const response = await fetch(`/api/team/${encodeURIComponent(teamMemberId)}/commission-rate`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ commissionRate }) });
    if (!response.ok) throw new Error('commission rate update failed');
    return response.json();
  }

  async createEstimate(customer, service, amount, catalogItemId = null, customerId = '', idempotencyKey = crypto.randomUUID(), pricing = {}, options = []) {
    if (!this.remote) throw new Error('API required for estimate creation');
    const response = await fetch('/api/estimates', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ ...(customerId ? { customerId } : { customer }), service, amount, ...(catalogItemId ? { catalogItemId } : {}), ...pricing, ...(options.length ? { options } : {}) }) });
    if (!response.ok) throw new Error('estimate creation failed');
    return response.json();
  }

  async addEstimateMedia(estimateId, url, caption = 'Supporting estimate image', kind = 'reference', idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for estimate media');
    const response = await fetch(`/api/estimates/${encodeURIComponent(estimateId)}/media`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ url, caption, kind }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'estimate media failed');
    return response.json();
  }

  async updateCallOutcome(callId, outcome, note = '', idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for call outcomes');
    const response = await fetch(`/api/calls/${encodeURIComponent(callId)}/outcome`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ outcome, note }) });
    if (!response.ok) throw new Error('call outcome update failed');
    return response.json();
  }

  async bookCall(callId, details = {}, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for call booking');
    const response = await fetch(`/api/calls/${encodeURIComponent(callId)}/book`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify(details) });
    if (!response.ok) throw new Error('call booking failed');
    return response.json();
  }

  async globalSearch(query) {
    return this.globalSearchPage(query);
  }

  async globalSearchPage(query, { page = 1, pageSize = 20 } = {}) {
    if (!this.remote) throw new Error('API required for global search');
    const params = new URLSearchParams({ q: String(query), page: String(page), pageSize: String(pageSize) });
    const response = await fetch(`/api/search?${params}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('global search failed');
    return response.json();
  }

  async updateEstimateLineItems(estimateId, items, discount = 0, taxRate = 0, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for estimate line items');
    const response = await fetch(`/api/estimates/${encodeURIComponent(estimateId)}/line-items`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ items, discount, taxRate }) });
    if (!response.ok) throw new Error('estimate line items update failed');
    return response.json();
  }

  async getEstimateRevisions(estimateId) {
    if (!this.remote) throw new Error('API required for estimate revisions');
    const response = await fetch(`/api/estimates/${encodeURIComponent(estimateId)}/revisions`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('estimate revisions unavailable');
    return response.json();
  }

  async sendEstimate(estimateId, channel = 'SMS', idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for estimate delivery');
    const response = await fetch(`/api/estimates/${encodeURIComponent(estimateId)}/send`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ channel }) });
    if (!response.ok) throw new Error('estimate send failed');
    return response.json();
  }

  async updateEstimate(id, action) {
    if (!this.remote) throw new Error('API required for estimate updates');
    const response = await fetch(`/api/estimates/${encodeURIComponent(id)}/${action}`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: '{}' });
    if (!response.ok) throw new Error('estimate update failed');
    return response.json();
  }

  async remindEstimate(id, channel = 'SMS') {
    if (!this.remote) throw new Error('API required for estimate reminders');
    const response = await fetch(`/api/estimates/${encodeURIComponent(id)}/remind`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ channel }) });
    if (!response.ok) throw new Error('estimate reminder failed');
    return response.json();
  }

  async remindOpenEstimates(maxAgeDays = 30, channel = 'SMS') {
    if (!this.remote) throw new Error('API required for estimate reminders');
    const response = await fetch('/api/estimates/reminders', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ maxAgeDays, channel }) });
    if (!response.ok) throw new Error('bulk estimate reminders failed');
    return response.json();
  }

  async convertEstimate(id, time, idempotencyKey = crypto.randomUUID(), slotId = '', locationId = '') {
    if (!this.remote) throw new Error('API required for estimate conversion');
    const response = await fetch(`/api/estimates/${encodeURIComponent(id)}/convert`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ time, ...(slotId ? { slotId } : {}), ...(locationId ? { locationId } : {}) }) });
    if (!response.ok) throw new Error('estimate conversion failed');
    return response.json();
  }

  async createInvoice(estimateId, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for invoice creation');
    const response = await fetch('/api/invoices', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ estimateId }) });
    if (!response.ok) throw new Error('invoice creation failed');
    return response.json();
  }

  async updateInvoiceBillTo(invoiceId, billTo, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for invoice bill-to');
    const response = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}/bill-to`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify(billTo) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'invoice bill-to update failed');
    return response.json();
  }

  async createJobInvoice(jobId, amount, due = '30 days', lineItems = [], idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for job invoice creation');
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/invoice`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ amount, due, ...(lineItems.length ? { lineItems } : {}) }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'job invoice creation failed');
    return response.json();
  }

  async bulkInvoiceJobs(jobIds, amount, due = '30 days', idempotencyKey = crypto.randomUUID(), lineItems = {}) {
    if (!this.remote) throw new Error('API required for bulk job invoicing');
    const response = await fetch('/api/dispatch/bulk-invoice', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ jobIds, amount, due, ...(lineItems && Object.keys(lineItems).length ? { lineItems } : {}) }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'bulk job invoicing failed');
    return response.json();
  }

  async createPaymentSchedule(invoiceId, installments, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for payment schedules');
    const response = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}/schedule`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ installments }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'payment schedule creation failed');
    return response.json();
  }

  async getPaymentSchedule(invoiceId) {
    if (!this.remote) throw new Error('API required for payment schedules');
    const response = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}/schedule`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('payment schedule unavailable');
    return response.json();
  }

  async payInvoice(id) {
    if (!this.remote) throw new Error('API required for payment');
    const response = await fetch(`/api/invoices/${encodeURIComponent(id)}/pay`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: '{}' });
    if (!response.ok) throw new Error('payment failed');
    return response.json();
  }

  async invoicePaymentLink(id) {
    if (!this.remote) throw new Error('API required for invoice payment links');
    const response = await fetch(`/api/invoices/${encodeURIComponent(id)}/payment-link`, { method: 'POST', headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('invoice payment link unavailable');
    return response.json();
  }

  async remindInvoice(id, channel = 'SMS') {
    if (!this.remote) throw new Error('API required for invoice reminders');
    const response = await fetch(`/api/invoices/${encodeURIComponent(id)}/remind`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ channel }) });
    if (!response.ok) throw new Error('invoice reminder failed');
    return response.json();
  }

  async requestInvoicePayment(id, channel = 'SMS') {
    if (!this.remote) throw new Error('API required for invoice payment requests');
    const response = await fetch(`/api/invoices/${encodeURIComponent(id)}/payment-request`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ channel }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'invoice payment request failed');
    return response.json();
  }

  async remindReceivables(minBalance = 0, channel = 'Email') {
    if (!this.remote) throw new Error('API required for receivables reminders');
    const response = await fetch('/api/receivables/reminders', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ minBalance, channel }) });
    if (!response.ok) throw new Error('receivables reminders failed');
    return response.json();
  }

  async logout() {
    if (this.token && this.remote) await fetch('/api/auth/logout', { method: 'POST', headers: { authorization: `Bearer ${this.token}` } });
    sessionStorage.removeItem(this.tokenKey);
    this.token = null;
    this.remote = null;
    this.session = null;
    this.state = {};
  }
}
