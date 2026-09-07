# Northstar production activation

Northstar is implementation-complete for the checked local workflows, but a production-equivalent launch still requires deployment-owned services and credentials. Use this checklist for each service-business tenant.

## 1. Provision the deployment

- Use a managed HTTPS host with a persistent volume or managed SQLite-compatible storage.
- Set `NODE_ENV=production`, a unique `NORTHSTAR_SESSION_SECRET`, and all five webhook secrets.
- Configure `NORTHSTAR_PUBLIC_URL` to the final HTTPS CRM origin.
- Set `NORTHSTAR_ALLOWED_ORIGINS` and, for multi-business deployments, `NORTHSTAR_SERVICE_ORIGINS_JSON` to the exact landing-page origins.
- Set `NORTHSTAR_TENANTS_JSON`, `NORTHSTAR_SERVICE_TENANTS_JSON`, `NORTHSTAR_CATALOG_JSON`, and owner/staff authentication configuration from the deployment secret store.
- In production, every attached service key must have an explicit tenant mapping, at least one tenant pricebook item, a configured owner or OIDC owner, and an HTTPS entry in `NORTHSTAR_SERVICE_ORIGINS_JSON`; `/api/ready` reports this as `tenantDeploymentContract`.
- Keep `NORTHSTAR_ALLOW_DEMO_LOGIN` disabled in production.

## 2. Configure identity and data safety

- Prefer the OIDC seam with a real issuer, audience, JWKS URL, and explicit tenant-scoped account mapping.
- Use managed shared storage before running more than one application writer.
- Configure automated backups, restore testing, retention, and secret rotation.
- Confirm audit-ledger and tenant-integrity checks remain healthy after a restart.

## 3. Activate providers deliberately

Set `NORTHSTAR_REQUIRE_LIVE_PROVIDERS=true` only after the corresponding provider contracts are configured and tested:

- Lead/marketing handoff: `NORTHSTAR_LEAD_PROVIDER_URL` and API key.
- Messaging and inbound replies: `NORTHSTAR_MESSAGE_PROVIDER_URL`, API key, and rotated webhook secret.
- Payments and signed settlement webhooks: `NORTHSTAR_PAYMENT_PROVIDER_URL`, API key, and rotated webhook secret.
- Financing: provider webhook secret and approved provider contract.
- Estimate/invoice documents: `NORTHSTAR_DOCUMENT_PROVIDER_URL`, API key, and public HTTPS URLs.
- Inventory/warehouse: `NORTHSTAR_INVENTORY_PROVIDER_URL`, API key, replay and rotation procedure.
- Accounting/ERP: `NORTHSTAR_ACCOUNTING_PROVIDER_URL`, API key, replay and rotation procedure.
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
sufficient: it does not prove provider settlement, identity-provider behavior,
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
