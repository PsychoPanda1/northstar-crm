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
  }

  getDashboard() {
    const seed = NORTHSTAR_DEMO_DATA[this.tenant.slug] || NORTHSTAR_DEMO_DATA['johnson-service-co'];
    return { ...seed, completedTasks: this.state.completedTasks || [] };
  }

  completeTask(taskIndex, completed) {
    const completedTasks = new Set(this.state.completedTasks || []);
    completed ? completedTasks.add(taskIndex) : completedTasks.delete(taskIndex);
    this.state.completedTasks = [...completedTasks];
    localStorage.setItem(this.key, JSON.stringify(this.state));
  }

  recordAction(action) {
    this.state.lastAction = { action, at: new Date().toISOString() };
    localStorage.setItem(this.key, JSON.stringify(this.state));
  }
}
