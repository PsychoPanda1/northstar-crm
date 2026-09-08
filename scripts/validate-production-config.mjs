import { readFile } from 'node:fs/promises';

const file = process.env.NORTHSTAR_ENV_FILE || '.env.production';
const text = await readFile(file, 'utf8').catch((error) => { console.error(`Could not read ${file}: ${error.code || 'read_failed'}`); process.exit(1); });
const values = {};
for (const rawLine of text.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (!match) continue;
  let value = match[2].trim();
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) value = value.slice(1, -1);
  values[match[1]] = value;
}

const errors = [];
const placeholder = (value) => !value || /^(replace-with|your-|owner@example\.com|crm\.example\.com|example\.com)/i.test(value);
const required = (key) => { if (placeholder(values[key])) errors.push(`${key} is missing or still a placeholder`); return values[key] || ''; };
const parseJson = (key, fallback) => { try { return JSON.parse(values[key] || JSON.stringify(fallback)); } catch { errors.push(`${key} is not valid JSON`); return fallback; } };
const httpsUrl = (key, value) => { if (!value) return; try { const url = new URL(value); if (url.protocol !== 'https:' || url.username || url.password) errors.push(`${key} must use HTTPS without credentials`); } catch { errors.push(`${key} is not a valid URL`); } };
const httpsOrigin = (key, value) => { httpsUrl(key, value); try { const url = new URL(value); if (url.origin !== value) errors.push(`${key} must be an HTTPS origin without a path`); } catch {} };
const boundedInteger = (key, fallback, minimum, maximum) => { const raw = values[key]; const value = raw === undefined || raw === '' ? fallback : Number(raw); if (!/^\d+$/.test(String(raw ?? fallback)) || !Number.isInteger(value) || value < minimum || value > maximum) errors.push(`${key} must be an integer between ${minimum} and ${maximum}`); return value; };

required('NORTHSTAR_HOST');
httpsUrl('NORTHSTAR_PUBLIC_URL', values.NORTHSTAR_PUBLIC_URL || `https://${values.NORTHSTAR_HOST || ''}`);
boundedInteger('NORTHSTAR_BACKUP_MAX_AGE_HOURS', 24, 1, 720);
boundedInteger('NORTHSTAR_EXPECTED_WRITERS', 1, 1, 100);
if (String(values.NORTHSTAR_REQUIRE_SQLITE || '').toLowerCase() === 'true' && Number(values.NORTHSTAR_EXPECTED_WRITERS || 1) !== 1) errors.push('NORTHSTAR_EXPECTED_WRITERS must be 1 when NORTHSTAR_REQUIRE_SQLITE=true');
for (const key of ['NORTHSTAR_SESSION_SECRET', 'NORTHSTAR_METRICS_SECRET', 'NORTHSTAR_PAYMENT_WEBHOOK_SECRET', 'NORTHSTAR_MESSAGE_WEBHOOK_SECRET', 'NORTHSTAR_CALL_WEBHOOK_SECRET', 'NORTHSTAR_FINANCING_WEBHOOK_SECRET', 'NORTHSTAR_FLEET_WEBHOOK_SECRET']) {
  const value = required(key);
  if (value && value.length < 32) errors.push(`${key} must be at least 32 characters`);
}
const tenants = parseJson('NORTHSTAR_TENANTS_JSON', []);
const serviceTenants = parseJson('NORTHSTAR_SERVICE_TENANTS_JSON', {});
const serviceOrigins = parseJson('NORTHSTAR_SERVICE_ORIGINS_JSON', {});
const catalog = parseJson('NORTHSTAR_CATALOG_JSON', []);
const validDigest = (value) => /^[0-9a-f]{64}$/i.test(String(value || '')) || /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/i.test(String(value || ''));
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const configuredOwners = parseJson('NORTHSTAR_OWNERS_JSON', []);
const oidcAccounts = parseJson('NORTHSTAR_OIDC_ACCOUNTS_JSON', []);
const ownerTenantIds = new Set([
  ...(Array.isArray(configuredOwners) ? configuredOwners.filter((item) => item?.id && validEmail(item?.email) && validDigest(item?.passwordDigest)).map((item) => String(item?.tenantId || '')) : []),
  ...(Array.isArray(oidcAccounts) ? oidcAccounts.filter((item) => String(item?.subject || '').trim() && String(item?.name || '').trim() && String(item?.role || '').toLowerCase() === 'owner').map((item) => String(item?.tenantId || '')) : []),
  ...(validEmail(values.NORTHSTAR_OWNER_EMAIL) && validDigest(values.NORTHSTAR_OWNER_PASSWORD_DIGEST) ? [String(values.NORTHSTAR_OWNER_TENANT_ID || '')] : [])
].filter(Boolean));
if (!Array.isArray(tenants) || !tenants.length) errors.push('NORTHSTAR_TENANTS_JSON must contain at least one tenant');
if (!serviceTenants || Array.isArray(serviceTenants) || !Object.keys(serviceTenants).length) errors.push('NORTHSTAR_SERVICE_TENANTS_JSON must map at least one service key');
if (!Array.isArray(catalog) || !catalog.length) errors.push('NORTHSTAR_CATALOG_JSON must contain at least one catalog item');
const tenantIds = new Set((Array.isArray(tenants) ? tenants : []).map((item) => String(item?.slug || '')));
if (tenantIds.size !== (Array.isArray(tenants) ? tenants.length : 0)) errors.push('NORTHSTAR_TENANTS_JSON must contain unique non-empty tenant slugs');
for (const tenant of Array.isArray(tenants) ? tenants : []) {
  const slug = String(tenant?.slug || '');
  if (!/^[a-z0-9-]{2,80}$/.test(slug) || String(tenant?.businessName || '').trim().length < 2 || String(tenant?.serviceLabel || '').trim().length < 2 || !String(tenant?.timeZone || '').trim()) errors.push(`tenant ${slug || '(unnamed)'} has invalid identity or service metadata`);
}
const mappedTenantIds = new Set();
for (const [service, tenantId] of Object.entries(serviceTenants || {})) {
  if (!/^[a-z0-9-]{2,80}$/.test(String(service))) errors.push(`service ${service} has an invalid service key`);
  if (!tenantIds.has(String(tenantId))) errors.push(`service ${service} maps to an unknown tenant`);
  else mappedTenantIds.add(String(tenantId));
  const origins = serviceOrigins?.[service];
  if (!Array.isArray(origins) || !origins.length) errors.push(`service ${service} has no HTTPS origin binding`);
  for (const origin of origins || []) httpsOrigin(`origin for ${service}`, origin);
}
for (const item of Array.isArray(catalog) ? catalog : []) {
  if (!tenantIds.has(String(item?.tenantId || ''))) errors.push(`catalog item ${item?.id || '(unnamed)'} maps to an unknown tenant`);
  if (String(item?.name || '').trim().length < 2 || String(item?.description || '').trim().length < 3 || !String(item?.priceFrom || '').trim() || !Number.isInteger(Number(item?.durationMinutes ?? 60)) || Number(item?.durationMinutes ?? 60) < 15 || Number(item?.durationMinutes ?? 60) > 1440) errors.push(`catalog item ${item?.id || '(unnamed)'} has invalid service details`);
  if (item?.serviceKeys !== undefined) {
    if (!Array.isArray(item.serviceKeys) || item.serviceKeys.length > 20) errors.push(`catalog item ${item?.id || '(unnamed)'} has invalid landing-page service scope`);
    const keys = Array.isArray(item.serviceKeys) ? item.serviceKeys.map((key) => String(key || '').trim().toLowerCase()) : [];
    if (new Set(keys).size !== keys.length || keys.some((key) => !/^[a-z0-9-]{2,80}$/.test(key) || serviceTenants[key] !== String(item?.tenantId || ''))) errors.push(`catalog item ${item?.id || '(unnamed)'} has a cross-tenant or invalid landing-page service scope`);
  }
}
for (const tenantId of tenantIds) {
  if (!mappedTenantIds.has(tenantId)) errors.push(`tenant ${tenantId} has no service mapping`);
  if (!Array.isArray(catalog) || !catalog.some((item) => String(item?.tenantId || '') === tenantId)) errors.push(`tenant ${tenantId} has no catalog item`);
  if (!ownerTenantIds.has(tenantId)) errors.push(`tenant ${tenantId} has no valid owner account`);
}

const oidcConfigured = Boolean(values.NORTHSTAR_OIDC_ISSUER || values.NORTHSTAR_OIDC_AUDIENCE || values.NORTHSTAR_OIDC_JWKS_URL || values.NORTHSTAR_OIDC_ACCOUNTS_JSON);
if (oidcConfigured) {
  for (const key of ['NORTHSTAR_OIDC_ISSUER', 'NORTHSTAR_OIDC_JWKS_URL', 'NORTHSTAR_OIDC_AUDIENCE', 'NORTHSTAR_OIDC_ACCOUNTS_JSON']) required(key);
  httpsUrl('NORTHSTAR_OIDC_ISSUER', values.NORTHSTAR_OIDC_ISSUER);
  httpsUrl('NORTHSTAR_OIDC_JWKS_URL', values.NORTHSTAR_OIDC_JWKS_URL);
} else {
  for (const key of ['NORTHSTAR_OWNER_EMAIL', 'NORTHSTAR_OWNER_PASSWORD_DIGEST', 'NORTHSTAR_OWNER_TENANT_ID']) required(key);
  if (values.NORTHSTAR_OWNER_TENANT_ID && !tenantIds.has(values.NORTHSTAR_OWNER_TENANT_ID)) errors.push('NORTHSTAR_OWNER_TENANT_ID is not present in NORTHSTAR_TENANTS_JSON');
}

const providerKinds = ['lead', 'message', 'inventory', 'accounting', 'payment', 'document', 'payroll'];
const overrides = parseJson('NORTHSTAR_TENANT_PROVIDER_CONFIG_JSON', {});
if (String(values.NORTHSTAR_REQUIRE_LIVE_PROVIDERS).toLowerCase() === 'true') for (const tenantId of tenantIds) for (const kind of providerKinds) {
  const globalKey = `NORTHSTAR_${kind.toUpperCase()}_PROVIDER_URL`;
  const url = values[globalKey] || overrides?.[tenantId]?.[kind]?.url || '';
  if (!url) errors.push(`${kind} provider is missing for tenant ${tenantId}`);
  httpsUrl(`${kind} provider for ${tenantId}`, url);
}
if (String(values.NORTHSTAR_REQUIRE_LIVE_PROVIDERS).toLowerCase() === 'true') for (const tenantId of tenantIds) {
  const paymentUrl = values.NORTHSTAR_PAYMENT_PROVIDER_URL || overrides?.[tenantId]?.payment?.url || '';
  const setupUrl = values.NORTHSTAR_PAYMENT_SETUP_PROVIDER_URL || overrides?.[tenantId]?.paymentSetup?.url || '';
  if (paymentUrl && !setupUrl) errors.push(`payment setup provider is missing for tenant ${tenantId}`);
  httpsUrl(`payment setup provider for ${tenantId}`, setupUrl);
}

if (errors.length) { console.error(['Production configuration preflight failed:', ...errors.map((item) => `- ${item}`)].join('\n')); process.exit(1); }
console.log(`Production configuration preflight passed for ${tenantIds.size} tenant${tenantIds.size === 1 ? '' : 's'} and ${Object.keys(serviceTenants).length} service key${Object.keys(serviceTenants).length === 1 ? '' : 's'}.`);
