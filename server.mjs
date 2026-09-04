import { createHmac, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const ROOT = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, '');
const PORT = Number(process.env.PORT || 4173);
const SECRET = process.env.NORTHSTAR_SESSION_SECRET || 'northstar-local-demo-secret-change-me';
const DATA_FILE = join(ROOT, '.northstar-data.json');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };

const tenants = {
  'johnson-service-co': { slug: 'johnson-service-co', businessName: 'Johnson Service Co.', serviceLabel: 'Home services' },
  'clearwater-plumbing': { slug: 'clearwater-plumbing', businessName: 'Clearwater Plumbing', serviceLabel: 'Plumbing' },
  'lowcountry-wash-co': { slug: 'lowcountry-wash-co', businessName: 'Lowcountry Wash Co.', serviceLabel: 'Power washing' },
  'palmetto-electric': { slug: 'palmetto-electric', businessName: 'Palmetto Electric', serviceLabel: 'Electrical' },
  'harbor-shine': { slug: 'harbor-shine', businessName: 'Harbor Shine Mobile', serviceLabel: 'Mobile car wash' }
};
const owners = { jordan: { id: 'owner_jordan', name: 'Jordan Smith', role: 'owner', tenantId: 'johnson-service-co' } };
const blankState = () => ({ completedTasks: [], lastAction: null, leads: [], jobs: [], estimates: [], invoices: [], plans: [], activities: [], customers: [] });
const persisted = existsSync(DATA_FILE) ? JSON.parse(readFileSync(DATA_FILE, 'utf8')) : {};
const state = new Map(Object.keys(tenants).map((tenantId) => [tenantId, { ...blankState(), ...(persisted[tenantId] || {}) }]));
const persist = () => { const snapshot = Object.fromEntries(state); writeFileSync(`${DATA_FILE}.tmp`, JSON.stringify(snapshot, null, 2)); renameSync(`${DATA_FILE}.tmp`, DATA_FILE); };

const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
const readBody = async (req) => { let body = ''; for await (const chunk of req) body += chunk; return body ? JSON.parse(body) : {}; };
const sign = (value) => createHmac('sha256', SECRET).update(value).digest('base64url');
const issueToken = (owner) => { const payload = Buffer.from(JSON.stringify({ sub: owner.id, tenantId: owner.tenantId, exp: Date.now() + 1000 * 60 * 60 * 8 })).toString('base64url'); return `${payload}.${sign(payload)}`; };
const authenticate = (req) => {
  const raw = req.headers.authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try { const claims = JSON.parse(Buffer.from(payload, 'base64url')); return claims.exp > Date.now() && owners.jordan.id === claims.sub && tenants[claims.tenantId] ? claims : null; } catch { return null; }
};
const dashboardFor = (tenantId) => {
  const base = { 'johnson-service-co': ['$84,290', '184', '32', '$42,680', '4.9', '$52,100', 9, '$12,480', 7, '$3,940', 14], 'clearwater-plumbing': ['$61,840', '142', '21', '$28,460', '4.8', '$38,720', 6, '$9,180', 4, '$2,860', 11], 'lowcountry-wash-co': ['$47,290', '216', '18', '$16,940', '4.9', '$22,180', 5, '$4,920', 8, '$2,140', 19], 'palmetto-electric': ['$93,480', '118', '27', '$64,820', '4.9', '$71,440', 8, '$19,320', 3, '$5,280', 8], 'harbor-shine': ['$39,620', '284', '16', '$12,740', '5.0', '$18,650', 4, '$3,180', 5, '$1,420', 26] }[tenantId];
  const saved = state.get(tenantId);
  return { tenant: tenants[tenantId], metrics: { revenue: base[0], jobs: base[1], estimates: base[2], estimateValue: base[3], satisfaction: base[4], pipeline: base[5] }, actions: { estimates: base[6], estimateValue: base[7], invoices: base[8], invoiceValue: base[9], renewals: base[10] }, completedTasks: saved.completedTasks, lastAction: saved.lastAction };
};
const reportsFor = (tenantId) => {
  const saved = state.get(tenantId);
  const money = (value) => `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const converted = saved.leads.filter((item) => item.status === 'Converted').length;
  const paid = saved.invoices.filter((item) => item.status === 'Paid').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const recurring = saved.plans.filter((item) => item.status === 'Active').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return { tenant: tenants[tenantId], period: 'All development activity', metrics: [{ label: 'New leads', value: String(saved.leads.length), detail: `${converted} converted to jobs` }, { label: 'Lead conversion', value: saved.leads.length ? `${Math.round((converted / saved.leads.length) * 100)}%` : '0%', detail: 'Captured leads becoming scheduled work' }, { label: 'Scheduled jobs', value: String(saved.jobs.filter((item) => item.status !== 'Canceled').length), detail: 'Tenant-owned dispatch records' }, { label: 'Cash collected', value: money(paid), detail: 'Paid invoices from quote-to-cash' }, { label: 'Monthly recurring', value: money(recurring), detail: 'Active service plans' }, { label: 'Customer touchpoints', value: String(saved.activities.length), detail: 'Logged calls, messages, and notes' }] };
};
const recordsFor = (tenantId, type, search = '') => {
  const business = tenants[tenantId];
  const customerNames = ['Michael Torres', 'Aisha Patel', 'Sarah Chen', 'Daniel Brooks', 'Lakeside Property Group'];
  const customers = [...customerNames.map((name, index) => ({ id: `${tenantId}_customer_${index + 1}`, tenantId, name, phone: ['843-555-0148', '843-555-0192', '843-555-0130', '843-555-0177', '843-555-0104'][index], location: ['105 King St', '38 Coming St', '12 Broad St', '214 Rutledge Ave', '17 Wentworth Ave'][index], lastService: ['Yesterday', 'Today', 'Aug 28', 'Aug 22', 'Aug 18'][index], status: index === 4 ? 'Lead' : 'Active' })), ...state.get(tenantId).customers];
  const leads = [{ id: `${tenantId}_lead_1`, name: 'Lakeside Property Group', service: business.serviceLabel, source: 'Website landing page', age: '3 hrs ago', value: '$4,800' }, { id: `${tenantId}_lead_2`, name: 'Maya Robinson', service: 'Emergency service', source: 'Google Business Profile', age: 'Yesterday', value: '$680' }, ...state.get(tenantId).leads];
  const estimates = [{ id: 'EST-1048', customer: 'Michael Torres', service: 'Annual service', value: '$1,240', status: 'Follow up', sent: '2 days ago' }, { id: 'EST-1045', customer: 'Sarah Chen', service: 'Kitchen remodel', value: '$4,820', status: 'Accepted', sent: 'Yesterday' }, { id: 'EST-1042', customer: 'Daniel Brooks', service: 'Repair visit', value: '$680', status: 'Viewed', sent: 'Aug 29' }, ...state.get(tenantId).estimates];
  const invoices = [{ id: 'INV-3021', customer: 'Lakeside Property Group', value: '$1,840', status: 'Overdue', due: 'Sep 4' }, { id: 'INV-3018', customer: 'Aisha Patel', value: '$620', status: 'Due soon', due: 'Sep 12' }, { id: 'INV-3009', customer: 'Michael Torres', value: '$289', status: 'Paid', due: 'Aug 30' }, ...state.get(tenantId).invoices];
  const plans = [{ id: 'PLAN-118', customer: 'Michael Torres', service: `${business.serviceLabel} maintenance`, value: '$149 / month', status: 'Renewing soon', renewal: 'Sep 18' }, { id: 'PLAN-113', customer: 'Aisha Patel', service: 'Priority service plan', value: '$89 / month', status: 'Active', renewal: 'Oct 4' }, ...state.get(tenantId).plans];
  const activities = [{ id: 'ACT-901', customer: 'Michael Torres', channel: 'Phone call', note: 'Confirmed annual maintenance window.', at: 'Today, 9:14 AM', status: 'Logged' }, { id: 'ACT-898', customer: 'Aisha Patel', channel: 'SMS', note: 'Sent arrival-window reminder.', at: 'Yesterday, 4:30 PM', status: 'Sent' }, ...state.get(tenantId).activities];
  const dispatch = [{ id: 'JOB-2194', customer: 'Michael Torres', service: 'Annual maintenance', technician: 'Alex Rivera', status: 'Confirmed', time: '8:00 – 10:00 AM' }, { id: 'JOB-2195', customer: 'Aisha Patel', service: 'Repair visit', technician: 'Marcus Thompson', status: 'En route', time: '10:30 – 12:00 PM' }, { id: 'JOB-2196', customer: 'Lakeside Property Group', service: 'Installation', technician: null, status: 'Unassigned', time: '1:00 – 4:00 PM' }, ...state.get(tenantId).jobs];
  const all = { customers, leads, estimates, invoices, plans, activities, dispatch }[type] || [];
  const q = search.trim().toLowerCase();
  return q ? all.filter((item) => Object.values(item).some((value) => String(value || '').toLowerCase().includes(q))) : all;
};
const sendStatic = (req, res) => {
  const requested = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
  const file = normalize(join(ROOT, relative));
  if (!file.startsWith(ROOT + sep) || !existsSync(file) || !statSync(file).isFile()) return json(res, 404, { error: 'not_found' });
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }); createReadStream(file).pipe(res);
};

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = requestUrl.pathname;
    if (pathname === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true, service: 'northstar-api', version: '0.2.0' });
    if (pathname === '/api/auth/demo-login' && req.method === 'POST') {
      const body = await readBody(req); const service = body.service || requestUrl.searchParams.get('service') || 'default'; const map = { default: 'johnson-service-co', plumbing: 'clearwater-plumbing', powerwashing: 'lowcountry-wash-co', electrician: 'palmetto-electric', carwash: 'harbor-shine' }; const tenantId = map[service] || map.default; const owner = { ...owners.jordan, tenantId }; return json(res, 200, { token: issueToken(owner), owner: { id: owner.id, name: owner.name, role: owner.role }, tenant: tenants[tenantId] });
    }
    if (pathname === '/api/session' && req.method === 'GET') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); return json(res, 200, { owner: { id: claims.sub, name: owners.jordan.name, role: owners.jordan.role }, tenant: tenants[claims.tenantId], permissions: ['dashboard:read', 'records:read', 'leads:write', 'jobs:write', 'estimates:write', 'invoices:write', 'tasks:write', 'actions:write'] }); }
    if (pathname === '/api/dashboard' && req.method === 'GET') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); return json(res, 200, dashboardFor(claims.tenantId)); }
    if (pathname === '/api/reports/overview' && req.method === 'GET') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); return json(res, 200, reportsFor(claims.tenantId)); }
    const recordsMatch = pathname.match(/^\/api\/(customers|leads|estimates|invoices|plans|activities|dispatch)$/);
    if (recordsMatch && req.method === 'GET') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); return json(res, 200, { items: recordsFor(claims.tenantId, recordsMatch[1], requestUrl.searchParams.get('search') || ''), tenantId: claims.tenantId }); }
    if (pathname === '/api/customers' && req.method === 'POST') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); const body = await readBody(req); if (!body.name || !body.phone) return json(res, 422, { error: 'name_and_phone_required' }); const customer = { id: `${claims.tenantId}_customer_${Date.now()}`, tenantId: claims.tenantId, name: String(body.name).slice(0, 100), phone: String(body.phone).slice(0, 40), location: String(body.location || 'Address pending').slice(0, 120), lastService: 'New customer', status: 'Active' }; state.get(claims.tenantId).customers.unshift(customer); persist(); return json(res, 201, customer); }
    if (pathname === '/api/leads' && req.method === 'POST') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); const body = await readBody(req); if (!body.name || !body.source) return json(res, 422, { error: 'name_and_source_required' }); const lead = { id: `${claims.tenantId}_lead_${Date.now()}`, tenantId: claims.tenantId, name: String(body.name).slice(0, 100), service: String(body.service || tenants[claims.tenantId].serviceLabel).slice(0, 80), source: String(body.source).slice(0, 80), age: 'Just now', value: '$0' }; state.get(claims.tenantId).leads.unshift(lead); persist(); return json(res, 201, lead); }
    const leadConvertMatch = pathname.match(/^\/api\/leads\/([^/]+)\/convert$/);
    if (leadConvertMatch && req.method === 'POST') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); const body = await readBody(req); const saved = state.get(claims.tenantId); const lead = saved.leads.find((item) => item.id === leadConvertMatch[1]); if (!lead) return json(res, 404, { error: 'lead_not_found' }); if (lead.convertedJobId) return json(res, 409, { error: 'lead_already_converted', jobId: lead.convertedJobId }); if (!body.time) return json(res, 422, { error: 'time_required' }); const job = { id: `${claims.tenantId}_job_${Date.now()}`, tenantId: claims.tenantId, leadId: lead.id, customerId: lead.id, customer: lead.name, service: lead.service, technician: null, status: 'Unassigned', time: String(body.time) }; saved.jobs.unshift(job); lead.status = 'Converted'; lead.convertedJobId = job.id; persist(); return json(res, 201, { lead, job }); }
    if (pathname === '/api/jobs' && req.method === 'POST') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); const body = await readBody(req); if (!body.customerId || !body.time) return json(res, 422, { error: 'customer_and_time_required' }); const job = { id: `${claims.tenantId}_job_${Date.now()}`, tenantId: claims.tenantId, customerId: String(body.customerId), service: String(body.service || tenants[claims.tenantId].serviceLabel), technician: null, status: 'Unassigned', time: String(body.time) }; state.get(claims.tenantId).jobs.unshift(job); persist(); return json(res, 201, job); }
    if (pathname === '/api/plans' && req.method === 'POST') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); const body = await readBody(req); const amount = Number(body.amount); if (!body.customer || !body.service || !Number.isFinite(amount) || amount <= 0 || !body.renewal) return json(res, 422, { error: 'customer_service_amount_and_renewal_required' }); const plan = { id: `PLAN-${Date.now()}`, tenantId: claims.tenantId, customer: String(body.customer).slice(0, 100), service: String(body.service).slice(0, 100), value: `$${amount.toFixed(2)} / month`, amount, status: 'Active', renewal: String(body.renewal).slice(0, 40) }; state.get(claims.tenantId).plans.unshift(plan); persist(); return json(res, 201, plan); }
    if (pathname === '/api/activities' && req.method === 'POST') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); const body = await readBody(req); const channels = ['Phone call', 'SMS', 'Email', 'Note']; if (!body.customer || !body.note || !channels.includes(body.channel || 'Note')) return json(res, 422, { error: 'customer_note_and_valid_channel_required' }); const activity = { id: `ACT-${Date.now()}`, tenantId: claims.tenantId, customer: String(body.customer).slice(0, 100), channel: body.channel || 'Note', note: String(body.note).slice(0, 500), at: 'Just now', status: body.channel === 'Note' ? 'Logged' : 'Queued' }; state.get(claims.tenantId).activities.unshift(activity); persist(); return json(res, 201, activity); }
    const planRenewMatch = pathname.match(/^\/api\/plans\/(PLAN-[^/]+)\/renew$/);
    if (planRenewMatch && req.method === 'POST') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); const plan = state.get(claims.tenantId).plans.find((item) => item.id === planRenewMatch[1]); if (!plan) return json(res, 404, { error: 'plan_not_found' }); plan.status = 'Active'; plan.renewedAt = new Date().toISOString(); persist(); return json(res, 200, plan); }
    const jobUpdateMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/(assign|status)$/);
    if (jobUpdateMatch && req.method === 'POST') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); const job = state.get(claims.tenantId).jobs.find((item) => item.id === jobUpdateMatch[1]); if (!job) return json(res, 404, { error: 'job_not_found' }); const body = await readBody(req); if (jobUpdateMatch[2] === 'assign') { if (!body.technician || String(body.technician).length > 80) return json(res, 422, { error: 'technician_required' }); job.technician = String(body.technician); if (job.status === 'Unassigned') job.status = 'Confirmed'; } else { const allowed = ['Unassigned', 'Confirmed', 'En route', 'In progress', 'Completed', 'Canceled']; if (!allowed.includes(body.status)) return json(res, 422, { error: 'invalid_job_status' }); job.status = body.status; } job.updatedAt = new Date().toISOString(); persist(); return json(res, 200, job); }
    if (pathname === '/api/estimates' && req.method === 'POST') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); const body = await readBody(req); const amount = Number(body.amount); if (!body.customer || !body.service || !Number.isFinite(amount) || amount <= 0) return json(res, 422, { error: 'customer_service_and_positive_amount_required' }); const estimate = { id: `EST-${Date.now()}`, tenantId: claims.tenantId, customer: String(body.customer).slice(0, 100), service: String(body.service).slice(0, 100), value: `$${amount.toFixed(2)}`, amount, status: 'Draft', sent: 'Just now' }; state.get(claims.tenantId).estimates.unshift(estimate); persist(); return json(res, 201, estimate); }
    const approveMatch = pathname.match(/^\/api\/estimates\/(EST-[^/]+)\/approve$/);
    if (approveMatch && req.method === 'POST') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); const estimate = state.get(claims.tenantId).estimates.find((item) => item.id === approveMatch[1]); if (!estimate) return json(res, 404, { error: 'estimate_not_found' }); estimate.status = 'Accepted'; estimate.approvedAt = new Date().toISOString(); persist(); return json(res, 200, estimate); }
    if (pathname === '/api/invoices' && req.method === 'POST') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); const body = await readBody(req); const estimate = state.get(claims.tenantId).estimates.find((item) => item.id === body.estimateId); if (!estimate || estimate.status !== 'Accepted') return json(res, 422, { error: 'approved_estimate_required' }); const invoice = { id: `INV-${Date.now()}`, tenantId: claims.tenantId, customer: estimate.customer, estimateId: estimate.id, value: estimate.value, amount: estimate.amount, status: 'Due', due: String(body.due || '30 days') }; state.get(claims.tenantId).invoices.unshift(invoice); persist(); return json(res, 201, invoice); }
    const payMatch = pathname.match(/^\/api\/invoices\/(INV-[^/]+)\/pay$/);
    if (payMatch && req.method === 'POST') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); const invoice = state.get(claims.tenantId).invoices.find((item) => item.id === payMatch[1]); if (!invoice) return json(res, 404, { error: 'invoice_not_found' }); invoice.status = 'Paid'; invoice.paidAt = new Date().toISOString(); persist(); return json(res, 200, invoice); }
    const taskMatch = pathname.match(/^\/api\/tasks\/(\d+)$/);
    if (taskMatch && req.method === 'POST') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); const body = await readBody(req); const index = Number(taskMatch[1]); const saved = state.get(claims.tenantId); saved.completedTasks = saved.completedTasks.filter((item) => item !== index); if (body.completed) saved.completedTasks.push(index); persist(); return json(res, 200, { completedTasks: saved.completedTasks }); }
    if (pathname === '/api/actions' && req.method === 'POST') { const claims = authenticate(req); if (!claims) return json(res, 401, { error: 'unauthorized' }); const body = await readBody(req); state.get(claims.tenantId).lastAction = { action: String(body.action || '').slice(0, 80), at: new Date().toISOString() }; persist(); return json(res, 201, { ok: true }); }
    if (req.method === 'GET') return sendStatic(req, res);
    return json(res, 405, { error: 'method_not_allowed' });
  } catch (error) { console.error(error); return json(res, 400, { error: 'bad_request' }); }
});
server.listen(PORT, () => console.log(`Northstar CRM running at http://localhost:${PORT}`));
