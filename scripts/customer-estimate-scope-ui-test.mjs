import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');
const customer = await readFile(new URL('../customer.html', import.meta.url), 'utf8');
for (const snippet of ['lineItems: (item.lineItems || []).map((lineItem)', 'options: item.options || []']) {
  if (!server.includes(snippet)) throw new Error(`customer estimate scope API wiring missing: ${snippet}`);
}
for (const snippet of ["const lineItems = estimate.lineItems?.length", "details('Line items'", '${lineItems}${options}${actionable}']) {
  if (!customer.includes(snippet)) throw new Error(`customer estimate scope UI wiring missing: ${snippet}`);
}
console.log('Northstar customer estimate scope checks passed');
