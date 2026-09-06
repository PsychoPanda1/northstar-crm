import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../landing-page-client.js', import.meta.url), 'utf8');
const storage = new Map();
const calls = [];
const sandbox = {
  URL,
  location: { origin: 'https://crm.example.test' },
  sessionStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
  crypto: { randomUUID: () => 'landing-test-key' },
  fetch: async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, headers: { get: () => 'landing-request-1' }, json: async () => ({ tenant: { contactPhone: '(843) 555-0100', contactEmail: 'hello@example.test', serviceArea: 'Charleston area' }, integration: { ownerPortalPath: '/portal?service=plumbing', ownerAuthEndpoint: '/api/auth/login', ownerAuthMethods: ['password', 'oidc'], ownerOidcAuthEndpoint: '/api/auth/oidc', leadEndpoint: '/api/public/leads?service=plumbing', bookingEndpoint: '/api/public/bookings?service=plumbing' } }) };
  }
};
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: 'landing-page-client.js' });
const client = new sandbox.NorthstarLandingClient({ service: 'plumbing', apiBase: 'https://crm.example.test' });
const ownerUrl = await client.ownerPortalUrl();
if (ownerUrl !== 'https://crm.example.test/portal?service=plumbing') throw new Error(`owner URL resolution failed: ${ownerUrl}`);
const contact = await client.publicContact();
if (contact.phone !== '(843) 555-0100' || contact.email !== 'hello@example.test' || contact.serviceArea !== 'Charleston area') throw new Error('public contact helper failed');
await client.ownerPasswordLogin('owner@example.test', 'owner-password');
if (calls[1].url !== 'https://crm.example.test/api/auth/login?service=plumbing' || calls[1].options.method !== 'POST' || JSON.parse(calls[1].options.body).email !== 'owner@example.test' || JSON.parse(calls[1].options.body).service !== 'plumbing') throw new Error('landing password owner login helper failed');
await client.ownerOidcLogin('signed-id-token');
if (calls[2].url !== 'https://crm.example.test/api/auth/oidc' || calls[2].options.method !== 'POST' || JSON.parse(calls[2].options.body).idToken !== 'signed-id-token') throw new Error('landing OIDC owner login helper failed');
await client.submitLead({ name: 'Landing Test', phone: '8435550100' });
if (calls.length !== 4 || calls[3].options.headers['idempotency-key'] !== 'landing-test-key') throw new Error('landing lead retry contract failed');
client.manifestPromise = Promise.resolve({ integration: { ownerAuthMethods: ['password'], ownerOidcAuthEndpoint: null } });
try { await client.ownerOidcLogin('signed-id-token'); throw new Error('password-only tenant accepted OIDC'); } catch (error) { if (error.message !== 'oidc_owner_auth_unavailable' || error.status !== 404 || calls.length !== 4) throw error; }
console.log('Northstar landing client test passed');
