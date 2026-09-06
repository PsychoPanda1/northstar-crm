# Northstar CRM agent guide

Northstar is a tenant-scoped field-service CRM for service landing pages. Future
agents should preserve the complete lifecycle: landing-page intake, customer and
location records, estimates, dispatch, technician closeout, invoicing, payment
settlement, customer self-service, and owner follow-up.

## Tenant attachment contract

- A landing page identifies the business with a configured `service` key.
- The public manifest is `GET /api/public/tenant?service=<service-key>`.
- Booking and intake use the reusable `booking.html` and
  `landing-page-client.js` contracts. Keep attribution, idempotency, and
  tenant routing intact when adding fields.
- The owner workspace uses `/portal?service=<service-key>` and must never load
  tenant records before authentication succeeds.
- Configure new businesses through deployment environment data such as
  `NORTHSTAR_TENANTS_JSON`, `NORTHSTAR_SERVICE_TENANTS_JSON`, and
  `NORTHSTAR_CATALOG_JSON`; do not hard-code customer credentials or secrets.

## Boundaries that must remain true

- Every API read and write is tenant-scoped and authorized server-side.
- Provider credentials stay server-side and are never placed in tenant
  manifests, browser code, snapshots, audit metadata, or customer payloads.
- Demo login is a local fallback only. Production requires configured identity,
  HTTPS, a unique session secret, and durable storage with backup/restore.
- Provider-pending states must remain explicit. Do not report a message,
  document, payment, or accounting handoff as delivered or settled without the
  provider callback or an equivalent verified response.
- Preserve idempotency keys, replay protection, audit events, opt-out rules,
  rate limits, and safe customer-facing payloads in new mutations.

## Change and verification workflow

1. Read `PARITY_MATRIX.md` and `PRODUCTION_ACTIVATION.md` before expanding a
   product area.
2. Prefer the existing repository methods and server contracts over duplicating
   fetch logic in a page.
3. Add or update a focused test under `scripts/` for each new workflow, then
   update `client-contract-test.mjs`, `openapi.yaml`, and the relevant contract
   document when a public route changes.
4. Run `npm run check` and the focused test while iterating. Before handoff,
   run `npm test`.
5. Inspect `git status --short`, commit only intentional files, and report the
   exact commit and verification results. A green local suite does not prove a
   live provider, production identity, managed storage, or a deployed release.

## Safe implementation defaults

- Use bounded input validation and stable, tenant-scoped identifiers.
- Keep static customer portal pages free of private CRM metadata unless the
  signed customer token authorizes that exact payload.
- Treat landing-page and customer-facing routes as public: validate input,
  apply rate limits, and avoid leaking internal IDs or credentials.
- Use `apply_patch` for edits and avoid destructive repository operations.
