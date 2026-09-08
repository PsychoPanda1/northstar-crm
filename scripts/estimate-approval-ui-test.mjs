import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const page = readFileSync(join(root, 'estimate.html'), 'utf8');
const required = ['id="approval-form"', 'name="approverName"', 'autocomplete="name"', 'id="approval-error"', 'role="alert"', 'type="submit"', "retryKey('approve'"];
if (required.some((fragment) => !page.includes(fragment))) throw new Error('estimate approval page is missing the accessible typed-signature contract');
if (page.includes("prompt('Your name for approval')")) throw new Error('estimate approval must not depend on a browser prompt');
console.log('Northstar estimate approval UI contract passed');
