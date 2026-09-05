// Demo repository contract. Every read is scoped by tenant slug. Replace this
// adapter with fetch('/api/...') once the authenticated session API exists.
const NORTHSTAR_DEMO_DATA = {
  'johnson-service-co': { metrics: { revenue: '$84,290', jobs: '184', estimates: '32', estimateValue: '$42,680', satisfaction: '4.9', pipeline: '$52,100' }, actions: { estimates: 9, estimateValue: '$12,480', invoices: 7, invoiceValue: '$3,940', renewals: 14 } },
  'clearwater-plumbing': { metrics: { revenue: '$61,840', jobs: '142', estimates: '21', estimateValue: '$28,460', satisfaction: '4.8', pipeline: '$38,720' }, actions: { estimates: 6, estimateValue: '$9,180', invoices: 4, invoiceValue: '$2,860', renewals: 11 } },
  'lowcountry-wash-co': { metrics: { revenue: '$47,290', jobs: '216', estimates: '18', estimateValue: '$16,940', satisfaction: '4.9', pipeline: '$22,180' }, actions: { estimates: 5, estimateValue: '$4,920', invoices: 8, invoiceValue: '$2,140', renewals: 19 } },
  'palmetto-electric': { metrics: { revenue: '$93,480', jobs: '118', estimates: '27', estimateValue: '$64,820', satisfaction: '4.9', pipeline: '$71,440' }, actions: { estimates: 8, estimateValue: '$19,320', invoices: 3, invoiceValue: '$5,280', renewals: 8 } },
  'harbor-shine': { metrics: { revenue: '$39,620', jobs: '284', estimates: '16', estimateValue: '$12,740', satisfaction: '5.0', pipeline: '$18,650' }, actions: { estimates: 4, estimateValue: '$3,180', invoices: 5, invoiceValue: '$1,420', renewals: 26 } }
};

class NorthstarDemoRepository {
  constructor(tenant) {
    this.tenant = tenant;
    this.key = `northstar-demo:${tenant.slug}`;
    this.state = JSON.parse(localStorage.getItem(this.key) || '{}');
    this.tokenKey = `northstar-demo-token:${tenant.slug}`;
    this.token = sessionStorage.getItem(this.tokenKey);
    this.apiAvailable = window.location.protocol !== 'file:';
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
    } catch { this.remote = null; this.session = null; }
  }

  async login(email, password) {
    if (!this.apiAvailable) throw new Error('api unavailable');
    const service = new URLSearchParams(window.location.search).get('service') || 'default';
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, service }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'login failed');
    const result = await response.json(); this.token = result.token; sessionStorage.setItem(this.tokenKey, this.token); return result;
  }

  getDashboard() {
    if (this.remote) return this.remote;
    const seed = NORTHSTAR_DEMO_DATA[this.tenant.slug] || NORTHSTAR_DEMO_DATA['johnson-service-co'];
    return { ...seed, completedTasks: this.state.completedTasks || [] };
  }

  async list(type, search = '') {
    if (!this.remote) return [];
    const response = await fetch(`/api/${type}${search ? `?search=${encodeURIComponent(search)}` : ''}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('records unavailable');
    return (await response.json()).items;
  }

  async getReport() {
    if (!this.remote) throw new Error('API required for reporting');
    const response = await fetch('/api/reports/overview', { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('report unavailable');
    return response.json();
  }

  async exportRecords(type) {
    if (!this.remote) throw new Error('API required for exports');
    const response = await fetch(`/api/export?type=${encodeURIComponent(type)}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('export unavailable');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `northstar-${type}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async markNotificationRead(id) {
    if (!this.remote) throw new Error('API required for notification state');
    const response = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'POST', headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('notification update failed');
    return response.json();
  }

  async resolveRequest(id, note) {
    if (!this.remote) throw new Error('API required for request resolution');
    const response = await fetch(`/api/requests/${encodeURIComponent(id)}/resolve`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ note }) });
    if (!response.ok) throw new Error('request resolution failed');
    return response.json();
  }

  completeTask(taskIndex, completed) {
    const completedTasks = new Set(this.state.completedTasks || []);
    completed ? completedTasks.add(taskIndex) : completedTasks.delete(taskIndex);
    this.state.completedTasks = [...completedTasks];
    localStorage.setItem(this.key, JSON.stringify(this.state));
    if (this.remote) fetch(`/api/tasks/${taskIndex}`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ completed }) }).catch(() => {});
  }

  recordAction(action) {
    this.state.lastAction = { action, at: new Date().toISOString() };
    localStorage.setItem(this.key, JSON.stringify(this.state));
    if (this.remote) fetch('/api/actions', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ action }) }).catch(() => {});
  }

  async updateJob(id, action, value) {
    if (!this.remote) throw new Error('API required for dispatch updates');
    const body = action === 'assign' ? { technician: value } : action === 'reschedule' ? { time: value } : { status: value };
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/${action}`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error('job update failed');
    return response.json();
  }

  async markJobNoShow(id, reason) {
    if (!this.remote) throw new Error('API required for no-show updates');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/no-show`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ reason }) });
    if (!response.ok) throw new Error('no-show update failed');
    return response.json();
  }

  async addJobVisit(id, time, technician = '') {
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

  async recommendTechnicians(jobId) {
    if (!this.remote) throw new Error('API required for dispatch recommendations');
    const response = await fetch(`/api/dispatch/recommendations?jobId=${encodeURIComponent(jobId)}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error('dispatch recommendations unavailable');
    return response.json();
  }

  async completeJob(id, note) {
    if (!this.remote) throw new Error('API required for job completion');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/complete`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ note }) });
    if (!response.ok) throw new Error('job completion failed');
    return response.json();
  }

  async technicianLink(id) {
    if (!this.remote) throw new Error('API required for technician links');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/technician-link`, { method: 'POST', headers: { authorization: `Bearer ${this.token}` } });
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

  async logActivity(customer, channel, note) {
    if (!this.remote) throw new Error('API required for activity logging');
    const response = await fetch('/api/activities', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ customer, channel, note }) });
    if (!response.ok) throw new Error('activity logging failed');
    return response.json();
  }

  async sendMessage(customer, channel, message) {
    if (!this.remote) throw new Error('API required for messages');
    const response = await fetch('/api/messages', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ customer, channel, message }) });
    if (!response.ok) throw new Error('message queue failed');
    return response.json();
  }

  async replyToMessage(messageId, message, idempotencyKey = crypto.randomUUID()) {
    if (!this.remote) throw new Error('API required for message replies');
    const response = await fetch(`/api/messages/${encodeURIComponent(messageId)}/reply`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ message }) });
    if (!response.ok) throw new Error('message reply failed');
    return response.json();
  }

  async convertLead(id, time, idempotencyKey = '') {
    if (!this.remote) throw new Error('API required for lead conversion');
    const response = await fetch(`/api/leads/${encodeURIComponent(id)}/convert`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}) }, body: JSON.stringify({ time }) });
    if (!response.ok) throw new Error('lead conversion failed');
    return response.json();
  }

  async updateLeadStatus(id, status, note = '') {
    if (!this.remote) throw new Error('API required for lead status updates');
    const response = await fetch(`/api/leads/${encodeURIComponent(id)}/status`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ status, ...(note ? { note } : {}) }) });
    if (!response.ok) throw new Error('lead status update failed');
    return response.json();
  }

  async createCustomer(name, phone, location) {
    if (!this.remote) throw new Error('API required for customer creation');
    const response = await fetch('/api/customers', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ name, phone, location }) });
    if (!response.ok) throw new Error('customer creation failed');
    return response.json();
  }

  async createAsset(customer, name, serial, installed, warrantyThrough) {
    if (!this.remote) throw new Error('API required for asset creation');
    const response = await fetch('/api/assets', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ customer, name, serial, installed, warrantyThrough }) });
    if (!response.ok) throw new Error('asset creation failed');
    return response.json();
  }

  async createCatalogItem(name, description, priceFrom) {
    if (!this.remote) throw new Error('API required for catalog editing');
    const response = await fetch('/api/catalog', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ name, description, priceFrom }) });
    if (!response.ok) throw new Error('catalog item creation failed');
    return response.json();
  }

  async createMaterial(name, sku, unit, unitCost, onHand, reorderPoint) {
    if (!this.remote) throw new Error('API required for material creation');
    const response = await fetch('/api/materials', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ name, sku, unit, unitCost, onHand, reorderPoint }) });
    if (!response.ok) throw new Error('material creation failed');
    return response.json();
  }

  async consumeMaterial(jobId, materialId, quantity) {
    if (!this.remote) throw new Error('API required for material usage');
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/materials`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ materialId, quantity }) });
    if (!response.ok) throw new Error('material usage failed');
    return response.json();
  }

  async logLabor(jobId, technician, hours, hourlyRate) {
    if (!this.remote) throw new Error('API required for labor logging');
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/labor`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ technician, hours, hourlyRate }) });
    if (!response.ok) throw new Error('labor logging failed');
    return response.json();
  }

  async createPurchaseOrder(materialId, vendor, quantity, unitCost) {
    if (!this.remote) throw new Error('API required for purchase orders');
    const response = await fetch('/api/purchase-orders', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ materialId, vendor, quantity, unitCost }) });
    if (!response.ok) throw new Error('purchase order creation failed');
    return response.json();
  }

  async receivePurchaseOrder(id, quantity = null) {
    if (!this.remote) throw new Error('API required for purchase order receiving');
    const response = await fetch(`/api/purchase-orders/${encodeURIComponent(id)}/receive`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify(quantity === null ? {} : { quantity }) });
    if (!response.ok) throw new Error('purchase order receiving failed');
    return response.json();
  }

  async renewPlan(id, time, slotId = null, idempotencyKey = '') {
    if (!this.remote) throw new Error('API required for plan renewal');
    const response = await fetch(`/api/plans/${encodeURIComponent(id)}/renew`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}) }, body: JSON.stringify({ time, ...(slotId ? { slotId } : {}) }) });
    if (!response.ok) throw new Error('plan renewal failed');
    return response.json();
  }

  async updatePlanStatus(id, action, note = '') {
    if (!this.remote) throw new Error('API required for service plan status updates');
    const response = await fetch(`/api/plans/${encodeURIComponent(id)}/${action}`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ ...(note ? { note } : {}) }) });
    if (!response.ok) throw new Error('service plan status update failed');
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

  async createLocation(customerId, label, address, idempotencyKey = '') {
    if (!this.remote) throw new Error('API required for locations');
    const response = await fetch(`/api/customers/${encodeURIComponent(customerId)}/locations`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}) }, body: JSON.stringify({ label, address }) });
    if (!response.ok) throw new Error('location creation failed');
    return response.json();
  }

  async createJob(customerId, service, time) {
    if (!this.remote) throw new Error('API required for job creation');
    const response = await fetch('/api/jobs', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ customerId, service, time }) });
    if (!response.ok) throw new Error('job creation failed');
    return response.json();
  }

  async updateJobChecklist(jobId, items) {
    if (!this.remote) throw new Error('API required for checklist management');
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/checklist`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ items }) });
    if (!response.ok) throw new Error('job checklist update failed');
    return response.json();
  }

  async createTeamMember(name, role, skills = []) {
    if (!this.remote) throw new Error('API required for team management');
    const response = await fetch('/api/team', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ name, role, skills }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'team member creation failed');
    return response.json();
  }

  async createEstimate(customer, service, amount, catalogItemId = null) {
    if (!this.remote) throw new Error('API required for estimate creation');
    const response = await fetch('/api/estimates', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ customer, service, amount, ...(catalogItemId ? { catalogItemId } : {}) }) });
    if (!response.ok) throw new Error('estimate creation failed');
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

  async convertEstimate(id, time) {
    if (!this.remote) throw new Error('API required for estimate conversion');
    const response = await fetch(`/api/estimates/${encodeURIComponent(id)}/convert`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ time }) });
    if (!response.ok) throw new Error('estimate conversion failed');
    return response.json();
  }

  async createInvoice(estimateId) {
    if (!this.remote) throw new Error('API required for invoice creation');
    const response = await fetch('/api/invoices', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ estimateId }) });
    if (!response.ok) throw new Error('invoice creation failed');
    return response.json();
  }

  async createPaymentSchedule(invoiceId, installments) {
    if (!this.remote) throw new Error('API required for payment schedules');
    const response = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}/schedule`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ installments }) });
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

  async logout() {
    if (this.token && this.remote) await fetch('/api/auth/logout', { method: 'POST', headers: { authorization: `Bearer ${this.token}` } });
    sessionStorage.removeItem(this.tokenKey);
    this.token = null;
    this.remote = null;
  }
}
