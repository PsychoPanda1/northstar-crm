import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../tenant-config.js', import.meta.url), 'utf8');
const required = [
  'NORTHSTAR_TENANTS[requested] || null',
  'fetch(`/api/public/tenant?service=${encodeURIComponent(requested || \'default\')}`)',
  'return fallback || unavailable;'
];
for (const snippet of required) {
  if (!source.includes(snippet)) throw new Error(`tenant configuration contract missing: ${snippet}`);
}
if (source.includes("if (requested && !fallback) return unavailable;")) throw new Error('custom service keys are still rejected before the tenant manifest request');
console.log('Northstar tenant config checks passed');
