import { readFile } from 'node:fs/promises';

const [compose, prometheus, alerts] = await Promise.all([
  readFile(new URL('../docker-compose.production.yml', import.meta.url), 'utf8'),
  readFile(new URL('../deploy/prometheus.yml', import.meta.url), 'utf8'),
  readFile(new URL('../deploy/alerts.yml', import.meta.url), 'utf8')
]);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
for (const snippet of ['prometheus:', 'prometheus-data:/prometheus', './deploy/prometheus.yml:/etc/prometheus/prometheus.yml:ro', './secrets/northstar_metrics.secret:/run/secrets/northstar_metrics:ro', '--storage.tsdb.retention.time=${PROMETHEUS_RETENTION:-15d}']) assert(compose.includes(snippet), `monitoring Compose contract missing: ${snippet}`);
for (const snippet of ['metrics_path: /api/metrics', 'bearer_token_file: /run/secrets/northstar_metrics', "targets: ['northstar:4173']", 'rule_files:']) assert(prometheus.includes(snippet), `Prometheus scrape contract missing: ${snippet}`);
for (const snippet of ['NorthstarTargetDown', 'NorthstarStorageIntegrityFailed', 'NorthstarBackupInvalid', 'NorthstarProviderQueueFailed']) assert(alerts.includes(snippet), `monitoring alert contract missing: ${snippet}`);
console.log('Northstar monitoring Compose contract passed');
