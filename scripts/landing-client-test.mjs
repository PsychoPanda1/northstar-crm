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
    return { ok: true, status: 200, headers: { get: () => 'landing-request-1' }, json: async () => ({ integration: { ownerPortalPath: '/portal?service=plumbing', leadEndpoint: '/api/public/leads?service=plumbing', bookingEndpoint: '/api/public/bookings?service=plumbing' } }) };
  }
};
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: 'landing-page-client.js' });
const client = new sandbox.NorthstarLandingClient({ service: 'plumbing', apiBase: 'https://crm.example.test' });
const ownerUrl = await client.ownerPortalUrl();
if (ownerUrl !== 'https://crm.example.test/portal?service=plumbing') throw new Error(`owner URL resolution failed: ${ownerUrl}`);
await client.submitLead({ name: 'Landing Test', phone: '8435550100' });
if (calls.length !== 2 || calls[1].options.headers['idempotency-key'] !== 'landing-test-key') throw new Error('landing lead retry contract failed');
console.log('Northstar landing client test passed');
