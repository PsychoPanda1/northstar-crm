import { readFile } from 'node:fs/promises';

const [server, repository, app, contract] = await Promise.all([
  readFile(new URL('../server.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../data-repository.js', import.meta.url), 'utf8'),
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../PORTAL_CONTRACT.md', import.meta.url), 'utf8')
]);

const required = [
  [server, 'customerTimelinePageFor'],
  [server, 'timeline_limit_and_offset_out_of_range'],
  [server, 'nextOffset'],
  [repository, 'getCustomerTimeline(id, limit = 24, offset = 0)'],
  [repository, 'timeline?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}'],
  [app, 'data-customer-timeline-more'],
  [app, 'Load older timeline events'],
  [app, 'repository.getCustomerTimeline(customerId, 24, offset)'],
  [contract, '`GET /api/customers/:id/timeline?limit=...&offset=...`']
];

for (const [source, snippet] of required) {
  if (!source.includes(snippet)) throw new Error(`customer timeline pagination contract missing: ${snippet}`);
}

console.log('Northstar customer timeline pagination checks passed');
