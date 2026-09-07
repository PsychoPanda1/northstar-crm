import { readFile } from 'node:fs/promises';

const [html, script, repository, serviceWorker] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../payroll-operations-owner.js', import.meta.url), 'utf8'),
  readFile(new URL('../data-repository.js', import.meta.url), 'utf8'),
  readFile(new URL('../northstar-sw.js', import.meta.url), 'utf8')
]);
for (const snippet of ['payroll-operations-owner.js', 'data-payroll-operations-card', 'data-payroll-operations-dispatch', 'dispatchPayrollRuns']) {
  if (!html.includes(snippet) && !script.includes(snippet) && !repository.includes(snippet)) throw new Error(`payroll operations UI contract missing: ${snippet}`);
}
if (!script.includes("['owner', 'accountant']")) throw new Error('payroll operations must remain owner/accountant scoped');
if (!serviceWorker.includes("'/payroll-operations-owner.js'") || !serviceWorker.includes("'/next-actions.css'") || !serviceWorker.includes("northstar-shell-v4")) throw new Error('payroll operations assets must remain installable offline');
console.log('Northstar payroll operations UI checks passed');
