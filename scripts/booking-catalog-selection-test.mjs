import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../booking-catalog-selection.js', import.meta.url), 'utf8');
let observerCallback;
const attributes = {};
const helpNodes = [];
const select = {
  value: '',
  options: [],
  closest: () => ({ append: (node) => helpNodes.push(node) }),
  setAttribute: (name, value) => { attributes[name] = value; }
};
const calls = [];
class MutationObserver {
  constructor(callback) { observerCallback = callback; }
  observe() {}
}
class LandingClient {
  async catalog() { return { items: [{ id: 'drain-cleaning', name: 'Drain cleaning' }] }; }
  availability(options) { calls.push(options); return Promise.resolve(options); }
}
const sandbox = {
  URLSearchParams,
  location: { search: '?service=plumbing&catalogItemId=drain-cleaning' },
  document: { querySelector: () => select, createElement: () => ({ id: '', textContent: '', hidden: false }) },
  MutationObserver,
  NorthstarLandingClient: LandingClient
};
vm.runInNewContext(source, sandbox, { filename: 'booking-catalog-selection.js' });
const client = new sandbox.NorthstarLandingClient();
await client.catalog();
await client.availability({ days: 7 });
assert.equal(JSON.stringify(calls), JSON.stringify([{ days: 7, catalogItemId: 'drain-cleaning' }]));
select.options = [{ value: 'drain-cleaning' }];
observerCallback();
assert.equal(select.value, 'drain-cleaning');
assert.equal(attributes['aria-describedby'], 'service-selection-help');
assert.equal(helpNodes.length, 1);
console.log('Northstar catalog booking deep-link runtime test passed');
