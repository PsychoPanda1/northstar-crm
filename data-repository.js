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
    } catch { this.apiAvailable = false; }
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

  async completeJob(id, note) {
    if (!this.remote) throw new Error('API required for job completion');
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}/complete`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ note }) });
    if (!response.ok) throw new Error('job completion failed');
    return response.json();
  }

  async logActivity(customer, channel, note) {
    if (!this.remote) throw new Error('API required for activity logging');
    const response = await fetch('/api/activities', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ customer, channel, note }) });
    if (!response.ok) throw new Error('activity logging failed');
    return response.json();
  }

  async convertLead(id, time) {
    if (!this.remote) throw new Error('API required for lead conversion');
    const response = await fetch(`/api/leads/${encodeURIComponent(id)}/convert`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ time }) });
    if (!response.ok) throw new Error('lead conversion failed');
    return response.json();
  }

  async createCustomer(name, phone, location) {
    if (!this.remote) throw new Error('API required for customer creation');
    const response = await fetch('/api/customers', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ name, phone, location }) });
    if (!response.ok) throw new Error('customer creation failed');
    return response.json();
  }

  async createAsset(customer, name, serial, installed) {
    if (!this.remote) throw new Error('API required for asset creation');
    const response = await fetch('/api/assets', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ customer, name, serial, installed }) });
    if (!response.ok) throw new Error('asset creation failed');
    return response.json();
  }

  async createJob(customerId, service, time) {
    if (!this.remote) throw new Error('API required for job creation');
    const response = await fetch('/api/jobs', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ customerId, service, time }) });
    if (!response.ok) throw new Error('job creation failed');
    return response.json();
  }

  async createEstimate(customer, service, amount) {
    if (!this.remote) throw new Error('API required for estimate creation');
    const response = await fetch('/api/estimates', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ customer, service, amount }) });
    if (!response.ok) throw new Error('estimate creation failed');
    return response.json();
  }

  async updateEstimate(id, action) {
    if (!this.remote) throw new Error('API required for estimate updates');
    const response = await fetch(`/api/estimates/${encodeURIComponent(id)}/${action}`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: '{}' });
    if (!response.ok) throw new Error('estimate update failed');
    return response.json();
  }

  async createInvoice(estimateId) {
    if (!this.remote) throw new Error('API required for invoice creation');
    const response = await fetch('/api/invoices', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ estimateId }) });
    if (!response.ok) throw new Error('invoice creation failed');
    return response.json();
  }

  async payInvoice(id) {
    if (!this.remote) throw new Error('API required for payment');
    const response = await fetch(`/api/invoices/${encodeURIComponent(id)}/pay`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: '{}' });
    if (!response.ok) throw new Error('payment failed');
    return response.json();
  }

  async logout() {
    if (this.token && this.remote) await fetch('/api/auth/logout', { method: 'POST', headers: { authorization: `Bearer ${this.token}` } });
    sessionStorage.removeItem(this.tokenKey);
    this.token = null;
    this.remote = null;
  }
}
