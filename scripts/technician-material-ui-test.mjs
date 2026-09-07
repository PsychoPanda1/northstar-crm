import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = readFileSync(`${root}/technician.html`, 'utf8');
const serviceWorker = readFileSync(`${root}/northstar-sw.js`, 'utf8');
const owner = readFileSync(`${root}/technician-material-owner.js`, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(html.includes('/technician-material-owner.js'), 'technician material dialog is not loaded');
assert(serviceWorker.includes("'/technician-material-owner.js'"), 'technician material dialog is not cached');
assert(owner.includes('/api/public/technician-job/materials') && owner.includes('inventoryLocations'), 'technician material dialog is not wired to stock locations');
assert(owner.includes('quantity > Number(material.onHand') && owner.includes('stopImmediatePropagation') && owner.includes('showModal'), 'technician material dialog is missing stock validation or prompt replacement');
console.log('Northstar technician material UI contract passed');
