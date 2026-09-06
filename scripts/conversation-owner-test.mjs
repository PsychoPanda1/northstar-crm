import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../conversation-owner.js', import.meta.url), 'utf8');
const serviceWorker = readFileSync(new URL('../northstar-sw.js', import.meta.url), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(index.includes('/conversation-owner.js'), 'owner portal does not load the conversation workspace');
assert(script.includes('id = \'conversation-view\'') && script.includes('threadGroups') && script.includes('data-conversation-open'), 'conversation workspace does not group or open customer threads');
assert(script.includes('replyToMessage') && script.includes('sendMessage'), 'conversation workspace does not expose reply and outbound message actions');
assert(serviceWorker.includes('/conversation-owner.js'), 'offline owner shell does not cache the conversation workspace asset');
console.log('Northstar conversation workspace checks passed');
