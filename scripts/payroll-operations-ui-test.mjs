import { readFile } from 'node:fs/promises';

const [html, script, integrationScript, repository, serviceWorker] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../payroll-operations-owner.js', import.meta.url), 'utf8'),
  readFile(new URL('../payroll-integration-owner.js', import.meta.url), 'utf8'),
  readFile(new URL('../data-repository.js', import.meta.url), 'utf8'),
  readFile(new URL('../northstar-sw.js', import.meta.url), 'utf8')
]);
for (const snippet of ['payroll-operations-owner.js', 'data-payroll-operations-card', 'data-payroll-operations-dispatch', 'data-payroll-operations-retry', 'retryPayrollRun', 'dispatchPayrollRuns']) {
  if (!html.includes(snippet) && !script.includes(snippet) && !repository.includes(snippet)) throw new Error(`payroll operations UI contract missing: ${snippet}`);
}
if (!script.includes("['owner', 'accountant']")) throw new Error('payroll operations must remain owner/accountant scoped');
if (!html.includes('payroll-integration-owner.js') || !integrationScript.includes('data-payroll-health-card') || !integrationScript.includes('data-payroll-health-dispatch') || !integrationScript.includes("['owner', 'accountant']")) throw new Error('payroll integration health UI contract missing');
if (!serviceWorker.includes("'/payroll-operations-owner.js'") || !serviceWorker.includes("'/payroll-integration-owner.js'") || !serviceWorker.includes("'/next-actions.css'") || !serviceWorker.includes("northstar-shell-v20")) throw new Error('payroll operations assets must remain installable offline');
console.log('Northstar payroll operations UI checks passed');
