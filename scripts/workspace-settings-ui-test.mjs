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
console.log('Northstar workspace settings UI contract passed');
