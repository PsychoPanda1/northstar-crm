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
}
