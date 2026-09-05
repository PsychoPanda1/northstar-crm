import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const app = readFileSync(`${root}app.js`, 'utf8');
const repository = readFileSync(`${root}data-repository.js`, 'utf8');
const customer = readFileSync(`${root}customer.html`, 'utf8');
const status = readFileSync(`${root}status.html`, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(repository.includes("this.previewOnly = window.location.protocol === 'file:'") && repository.includes("if (!this.previewOnly) throw new Error('authenticated dashboard required')"), 'repository preview fallback is not restricted to file previews');
assert(app.includes('repository.authRequired') && app.includes('Owner sign-in required'), 'HTTP authentication failure does not fail closed');
assert(app.includes('decorateDispatchNoShows(); decorateDispatchRebooks();'), 'dispatch recovery actions are not reapplied after search');
assert(app.includes("!['Canceled', 'No-show'].includes(status)"), 'dispatch rebooking does not include no-show jobs');
assert(app.includes('Visit progress:') && app.includes('data-job-visit-summary'), 'owner job detail does not expose multi-visit progress');
assert(app.includes("/^INV-\\d{13,}$/.test(item.id || '') && item.status !== 'Paid'"), 'owner invoice cards do not expose collection for open balances');
assert(customer.includes("job.status === 'No-show' ? 'Book a new visit'"), 'customer portal does not expose no-show recovery');
assert(status.includes('body.visits') && status.includes('Visit progress') && status.includes('/api/public/job-status/cancel'), 'customer status page does not expose multi-visit progress and cancellation');
console.log('Northstar client contract checks passed');
