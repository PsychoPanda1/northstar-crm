import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const app = readFileSync(`${root}/app.js`, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(app.includes("dispatchRouteOptimizeButton.id = 'dispatch-route-optimize'"), 'bulk route optimizer control is missing');
assert(app.includes('repository.optimizeRoutes(date.trim(), [], { respectTimeWindows: true'), 'bulk route optimizer does not preserve time windows');
assert(app.includes("dispatchRouteCalendarButton.id = 'dispatch-route-calendar'"), 'route calendar export control is missing');
assert(app.includes('repository.downloadRouteCalendar(date.trim(), technician.trim())'), 'route calendar export is not wired to the repository');
console.log('Northstar dispatch route tools UI contract passed');
