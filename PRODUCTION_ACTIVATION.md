# Northstar production activation

Northstar is implementation-complete for the checked local workflows, but a production-equivalent launch still requires deployment-owned services and credentials. Use this checklist for each service-business tenant.

## 1. Provision the deployment

- Use a managed HTTPS host with a persistent volume or managed SQLite-compatible storage.
- Set `NORTHSTAR_REQUIRE_SQLITE=true` for production containers and confirm `/api/ready` reports `storageConfiguration: true`; keep JSON storage limited to local development or an explicitly isolated recovery environment.
- Set `NODE_ENV=production`, a unique `NORTHSTAR_SESSION_SECRET`, and all five webhook secrets.
- Set a unique `NORTHSTAR_METRICS_SECRET`; production readiness fails closed without the authenticated monitoring scrape credential.
- Configure `NORTHSTAR_PUBLIC_URL` to the final HTTPS CRM origin.
- Set `NORTHSTAR_ALLOWED_ORIGINS` and, for multi-business deployments, `NORTHSTAR_SERVICE_ORIGINS_JSON` to the exact landing-page origins.
- Set `NORTHSTAR_TENANTS_JSON`, `NORTHSTAR_SERVICE_TENANTS_JSON`, `NORTHSTAR_CATALOG_JSON`, and owner/staff authentication configuration from the deployment secret store.
- In production, every attached service key must have an explicit tenant mapping, at least one tenant pricebook item, a configured owner or OIDC owner, and an HTTPS entry in `NORTHSTAR_SERVICE_ORIGINS_JSON`; `/api/ready` reports this as `tenantDeploymentContract`.
- Keep `NORTHSTAR_ALLOW_DEMO_LOGIN` disabled in production.

## 2. Configure identity and data safety

- Prefer the OIDC seam with a real issuer, audience, JWKS URL, and explicit tenant-scoped account mapping.
- The included Compose handoff permits OIDC-only owner activation; leave the legacy `NORTHSTAR_OWNER_EMAIL`, `NORTHSTAR_OWNER_PASSWORD_DIGEST`, and `NORTHSTAR_OWNER_TENANT_ID` values empty when the deployment provisions a tenant-bound OIDC owner instead.
- Use managed shared storage before running more than one application writer.
- Keep `NORTHSTAR_EXPECTED_WRITERS=1` for the included SQLite deployment. Readiness fails closed if a production process claims multiple writers without a connected managed shared database adapter.
- Configure automated backups, restore testing, retention, and secret rotation.
- Run `npm run test:sqlite-backup` during the release drill and record the restored database verification result before accepting traffic.
- Set a distinct `NORTHSTAR_BACKUP_FILE` (or deployment-managed equivalent) and confirm `/api/ready` reports `backupConfiguration: true` before accepting traffic.
- Confirm audit-ledger and tenant-integrity checks remain healthy after a restart.

## 3. Activate providers deliberately

Set `NORTHSTAR_REQUIRE_LIVE_PROVIDERS=true` only after the corresponding provider contracts are configured and tested:

- Lead/marketing handoff: `NORTHSTAR_LEAD_PROVIDER_URL` and API key.
- Messaging and inbound replies: `NORTHSTAR_MESSAGE_PROVIDER_URL`, API key, and rotated webhook secret.
- Payments and signed settlement webhooks: `NORTHSTAR_PAYMENT_PROVIDER_URL`, API key, and rotated webhook secret.
- Stored payment methods: use the payment provider's hosted setup flow to create opaque customer-scoped method tokens; only send those tokens plus display metadata to Northstar, and verify provider-side detach/expiry behavior before enabling recurring autopay.
- If `NORTHSTAR_REQUIRE_LIVE_PROVIDERS=true` and a live payment provider is enabled, configure the tenant `paymentSetup` provider as well; `/api/ready` fails closed with `livePaymentSetupProvider` when hosted stored-method setup is missing. Use `NORTHSTAR_PAYMENT_SETUP_PROVIDER_API_KEY` for a global setup-provider credential; it is kept separate from the payment-intent API key.
- Financing: provider webhook secret and approved provider contract.
- Estimate/invoice documents: tenant document-provider override when businesses use separate delivery accounts, otherwise `NORTHSTAR_DOCUMENT_PROVIDER_URL`, plus API key and public HTTPS URLs.
- Technician field media: `NORTHSTAR_MEDIA_PROVIDER_URL` or a tenant `media` override for short-lived signed object-storage uploads; verify upload expiry, object lifecycle, and provider-side deletion/retention.
- Inventory/warehouse: `NORTHSTAR_INVENTORY_PROVIDER_URL`, API key, replay and rotation procedure.
- Accounting/ERP: `NORTHSTAR_ACCOUNTING_PROVIDER_URL`, API key, replay and rotation procedure.
- Payroll/ERP: `NORTHSTAR_PAYROLL_PROVIDER_URL`, API key, approved payroll-period replay and rotation procedure.
- Telephony and GPS: provider-specific signed webhook contracts, replay protection, retention, and access controls.

Never place provider credentials in tenant manifests, browser code, exported snapshots, or audit metadata.

## 4. Verify before accepting traffic

Run the local release suite first:

```sh
npm test
```

Then verify the deployed host:

```sh
curl -i https://crm.example.com/api/ready
curl -i https://crm.example.com/api/health
```

The repository also provides a bounded deployment verifier. It requires HTTPS,
checks health, readiness, and the canonical OpenAPI contract, and can validate a
configured tenant manifest without printing credentials:

```sh
NORTHSTAR_DEPLOYMENT_URL=https://crm.example.com \
NORTHSTAR_DEPLOYMENT_SERVICE=your-service \
npm run verify:deployment
```

For a local loopback check only, add
`NORTHSTAR_DEPLOYMENT_ALLOW_HTTP=true`. A passing verifier is necessary but not
sufficient: when `NORTHSTAR_DEPLOYMENT_SERVICE` is supplied, it also verifies the
tenant manifest, customer-safe catalog, and at least one valid capacity slot for
the attached landing page. It still does not prove provider settlement, identity-provider behavior,
backup restoration, or the complete customer journey.

The same check is available as the manual `Verify hosted Northstar deployment`
GitHub Actions workflow. Supply the deployed HTTPS origin and optional service
key in the workflow inputs; the workflow only reads the repository and does not
need provider credentials.

`/api/ready` must return HTTP 200 with every returned check true. Validate at least one complete tenant journey: landing-page lead or booking → customer → estimate → approval → scheduled job → technician closeout → invoice → signed payment settlement → customer portal conversation. Confirm the corresponding audit events, provider delivery states, notifications, and customer-safe payloads.

## 5. Release and handoff

- Push only the intended commits to the authorized GitHub repository.
- Confirm the GitHub Actions CI and container readiness workflow are green.
- Record the deployed commit, provider contract versions, secret rotation dates, backup restore result, and rollback target.
- Attach each landing page to its service key and owner-portal URL from `LANDING_PAGE_INTEGRATION.md`.
- Do not call the deployment production-equivalent until the remaining-work column in `PARITY_MATRIX.md` is resolved for that deployment.
