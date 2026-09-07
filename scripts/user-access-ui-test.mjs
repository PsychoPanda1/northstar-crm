import { readFile, readFileSync } from 'node:fs';

const script = readFileSync(new URL('../user-access-owner.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
for (const snippet of ['id = \'user-access-dialog\'', 'createUserInvite', 'resetUserPassword', 'revokeUserInvite', 'updateUserStatus', 'data-user-access-link']) {
  if (!script.includes(snippet)) throw new Error(`user access UI wiring missing: ${snippet}`);
}
if (!html.includes('src="/user-access-owner.js"')) throw new Error('user access owner script is not loaded');
console.log('Northstar user access UI contract passed');
