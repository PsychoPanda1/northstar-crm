import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Script } from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
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
