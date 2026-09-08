import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Script } from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const bookingSource = readFileSync(join(root, 'booking.html'), 'utf8');
if (!bookingSource.includes('booking-catalog-selection.js') || !bookingSource.includes('select.required') || !bookingSource.includes('Choose a service before selecting an appointment time.') || !bookingSource.includes("form.setAttribute('aria-describedby','message')") || !bookingSource.includes('message.tabIndex=-1')) throw new Error('booking page must require an explicit service, honor deep-linked catalog items, and expose focusable validation feedback');
const publicFetchSource = readFileSync(join(root, 'northstar-public-fetch.js'), 'utf8');
if (!publicFetchSource.includes('northstarPublicFetch') || !publicFetchSource.includes('AbortController') || !publicFetchSource.includes('timeoutMs ?? 20000') || !publicFetchSource.includes('controller.abort()')) throw new Error('public page fetch guard is incomplete');
for (const page of ['accept-invite.html', 'change-order.html', 'estimate.html', 'invoice.html', 'review.html']) if (!readFileSync(join(root, page), 'utf8').includes('northstar-public-fetch.js')) throw new Error(`${page} does not load the public fetch guard`);
const htmlFiles = readdirSync(root).filter((name) => name.endsWith('.html'));
let scripts = 0;
for (const file of htmlFiles) {
  const source = readFileSync(join(root, file), 'utf8');
  const matches = source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi);
  for (const match of matches) {
    if (!match[1].trim()) continue;
    scripts += 1;
    new Script(match[1], { filename: file });
  }
}
if (!scripts) throw new Error('no inline HTML scripts found');
console.log(`Northstar HTML script checks passed: ${scripts} inline scripts`);
