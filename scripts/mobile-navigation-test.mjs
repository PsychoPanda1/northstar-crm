import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = readFileSync(`${root}/index.html`, 'utf8');
const app = readFileSync(`${root}/app.js`, 'utf8');
const styles = readFileSync(`${root}/styles.css`, 'utf8');

const required = [
  ['workspace sidebar id', html.includes('id="workspace-sidebar"')],
  ['mobile menu toggle', html.includes('id="mobile-nav-toggle"') && html.includes('aria-controls="workspace-sidebar"')],
  ['mobile backdrop', html.includes('id="mobile-nav-backdrop"')],
  ['toggle state synchronization', app.includes("setAttribute('aria-expanded', String(open))")],
  ['backdrop close behavior', app.includes("mobileNavBackdrop?.addEventListener('click', closeMobileNavigation)")],
  ['escape close behavior', app.includes("if (event.key === 'Escape') closeMobileNavigation()")],
  ['mobile drawer styling', styles.includes('.sidebar.mobile-open') && styles.includes('.mobile-nav-backdrop.visible')]
];

const missing = required.filter(([, present]) => !present).map(([name]) => name);
if (missing.length) throw new Error(`mobile navigation contract missing: ${missing.join(', ')}`);
console.log('Northstar mobile navigation contract passed');
