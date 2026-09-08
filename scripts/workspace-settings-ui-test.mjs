import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const app = readFileSync(`${root}/app.js`, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(app.includes("workspaceSettingsButton.id = 'workspace-settings-view'"), 'workspace setup control is missing');
assert(app.includes("querySelector('#workspace-settings-form')"), 'workspace setup form is missing');
assert(app.includes('repository.getWorkspaceSettings()'), 'workspace setup does not load tenant settings');
assert(app.includes('repository.updateWorkspaceSettings(update, crypto.randomUUID())'), 'workspace setup does not persist tenant settings safely');
assert(app.includes('serviceAreaRules'), 'workspace setup omits service-area controls');
assert(app.includes('parseIntakeFields'), 'workspace setup omits guided intake controls');
assert(app.includes("field.type === 'select' && Array.isArray(field.options)"), 'workspace setup does not serialize select options');
assert(app.includes("type === 'select' && options ? { options: csvList(options) }"), 'workspace setup does not restore select options');
assert(app.includes('id | type | label | required | options'), 'workspace setup does not document intake option format');
const settings = readFileSync(`${root}/settings.js`, 'utf8');
assert(settings.includes('data-settings-launch-checklist'), 'owner launch checklist is missing');
assert(settings.includes('At least one active service in the pricebook'), 'launch checklist omits pricebook readiness');
assert(settings.includes('Deployment readiness gate passing'), 'launch checklist omits deployment readiness');
assert(settings.includes('repository.getLandingPageKeys()'), 'launch checklist does not inspect connected landing pages');
const userAccess = readFileSync(`${root}/user-access-owner.js`, 'utf8');
assert(userAccess.includes('createUserInvite') && userAccess.includes('resetUserPassword') && userAccess.includes('revokeUserInvite') && userAccess.includes('updateUserStatus'), 'owner user access dialog is incomplete');
console.log('Northstar workspace settings UI contract passed');
