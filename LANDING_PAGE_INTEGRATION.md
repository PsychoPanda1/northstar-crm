# Landing page integration

The tenant manifest may include optional public `contactPhone`, `contactEmail`, and `serviceArea` values for call-to-action and coverage copy. Treat them as display metadata only; owner authentication and customer records remain protected by their respective server-side boundaries.

The reusable booking page consumes `contactPhone`, `contactEmail`, and `serviceArea` when present, rendering click-to-call, email, and coverage details without requiring service-specific page edits.

Use the public lead endpoint from a service landing page. The service key can be sent in the JSON body or in the page URL, for example `/api/public/leads?service=plumbing`.

```js
await fetch('https://crm.example.com/api/public/leads?service=plumbing', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
  body: JSON.stringify({
    name: form.name,
    phone: form.phone,
    email: form.email,
    location: form.location,
    message: form.message,
    requestedService: 'Emergency leak repair',
    source: 'Clearwater Plumbing landing page',
    website: '' // honeypot; keep empty for real visitors
  })
});
```

Supported service keys are `plumbing`, `powerwashing`, `electrician`, and `carwash`. Optional bounded `location` and `message` fields are preserved in the owner inbox so operators can see the customer's service context before calling back. A valid request returns `201` with `{ received: true, id, tenant }`. Repeating the same `Idempotency-Key` with the same payload returns the original lead with `200` and `duplicate: true`, while reusing a key for a different payload returns `409 idempotency_key_reused`; this prevents retry-created duplicates and accidental key reuse. When both the URL query and JSON body provide `service`, they must match; a conflict returns `409 service_mismatch` rather than allowing one landing page to route work into another tenant. Missing or malformed email/phone contact information returns `422`; malformed or oversized JSON returns a controlled `400`; the honeypot and rate limit return `422` and `429` respectively.

The tenant discovery response includes `integration.version: 2`, copyable `bookingPath`, `ownerPortalPath`, `ownerAuthEndpoint`, `ownerAuthRefreshEndpoint`, `ownerAuthLogoutEndpoint`, `ownerAuthMethods`, `ownerOidcAuthEndpoint`, `leadEndpoint`, `bookingEndpoint`, and `availabilityEndpoint` values, the `technicianFieldEstimateEndpoint`, customer-portal action endpoints, capability flags, and `bookingRequirements`. `ownerAuthMethods` always includes `password`; it also includes `oidc` only when that tenant has a provisioned, verified OIDC owner account. The OIDC endpoint exchanges a signed identity-provider ID token for the same tenant-scoped session contract and must not be called with a browser-supplied tenant or role. The refresh and logout endpoints require the current authenticated session token; logout revokes it server-side and clears the HTTP-only session cookie. The current requirements declare a service address as required, an `Idempotency-Key` as required for retry safety, slot selection as preferred, and a maximum of 12 checklist items. The manifest also advertises customer portal preferences through `customerPortalEndpoints.preferences` and `capabilities.technicianFieldEstimates`. Future landing-page agents should consume this manifest rather than duplicating service-route assumptions.

`bookingRequirements.appointmentMinutes` is the tenant's capacity reservation for each selected slot. The seeded verticals use 60 minutes for plumbing/home services and mobile car wash, 90 minutes for electrical, and 120 minutes for power washing; configured tenants may set 30–480 minutes through `NORTHSTAR_TENANTS_JSON`.

Landing pages should resolve their service identity from `GET /api/public/tenant?service=plumbing`. The response includes an `integration` manifest with copyable `bookingPath`, `ownerPortalPath`, `leadEndpoint`, `bookingEndpoint`, and `availabilityEndpoint` values plus capability flags; use those values instead of hard-coding service routes when an agent attaches a new landing page. Unknown service identifiers return `404` instead of falling back to the default tenant. Fetch the availability endpoint to render `slotOptions` (`id`, display `label`, UTC `startsAt`/`endsAt`, and IANA `timeZone`). The legacy `slots` label array remains available. Submit a selected slot to the manifest's `bookingEndpoint` with `{ name, phone, email, location, requestedService, slotId, time, source, checklist, website: '' }` and an `Idempotency-Key`; `slotId` is preferred and `time` remains a compatibility fallback. `location` is required for bookings so dispatch receives a routable service address; use lead intake when an address is not yet known. `checklist` is optional: when supplied, it may contain up to 12 short labels that become the technician's required completion steps for that booked job; omitted or invalid checklists use the safe default. A successful booking returns `201` with a tenant-scoped job ID, normalized appointment timestamps, a short-lived `customerPortalToken` for the status page, and a separate `customerPortalAccessToken` scoped to that customer for `/customer.html`; retries with the same payload and key return `200` and `duplicate: true`, while reusing a key for a different payload returns `409` with `idempotency_key_reused`. Availability removes slots occupied by active tenant jobs and slots that exceed configured aggregate daily capacity targets, so the landing page and booking validation share the same capacity check. The status token can call `GET /api/public/job-status`, `POST /api/public/job-status/reschedule`, or `POST /api/public/job-status/cancel` with an `Idempotency-Key`; the customer access token can call the richer `/api/public/customer-portal` endpoints for requests, cancellation, rescheduling, payment intents, and preference management using `customerPortalEndpoints.preferences`. The current adapter supplies demo capacity; production should connect live timezone-aware availability, technician allocation, and durable storage.

New landing pages can include the reusable landing-page-client.js browser helper. Construct NorthstarLandingClient with a service key, then call manifest(), catalog(), availability(), ownerPortalUrl(), ownerPasswordLogin(), ownerOidcLogin(), refreshOwnerSession(), logoutOwnerSession(), submitLead(), or book(). `ownerPortalUrl()` resolves the manifest's tenant-specific owner portal path, including the service context, so an owner-login link does not need to hard-code `/portal` or a service key. `ownerPasswordLogin(email, password)` binds the service key into the tenant-bound password login request without persisting credentials. `ownerOidcLogin(idToken)` is a provider-neutral helper that exchanges an already-issued signed ID token only when the tenant manifest advertises `oidc`; the identity provider SDK and token acquisition remain the landing page's responsibility. `refreshOwnerSession(token)` and `logoutOwnerSession(token)` use manifest-discovered endpoints and send the current token only as an authorization header. It resolves routes through the versioned tenant manifest and creates session-stable idempotency keys for lead and booking retries. Pass apiBase when the CRM is hosted on another origin, and add that origin to NORTHSTAR_ALLOWED_ORIGINS.

## Attach a new service page

Use this handoff sequence for plumbing, power washing, electrical, car wash, or a configured vertical:

1. Add the tenant and service mapping to `NORTHSTAR_TENANTS_JSON` and `NORTHSTAR_SERVICE_TENANTS_JSON`, then add its customer-facing services to `NORTHSTAR_CATALOG_JSON`; use a unique tenant slug and a real owner credential for production.
2. Set `NORTHSTAR_ALLOWED_ORIGINS` to the exact landing-page origin, including scheme and host. For a deployment serving multiple businesses, optionally set `NORTHSTAR_SERVICE_ORIGINS_JSON` to a JSON object such as `{"plumbing":["https://plumbing.example"],"electrician":["https://electric.example"]}`; a mapped service then accepts lead and booking mutations only from its listed origins. Restart the CRM and verify `GET /api/public/tenant?service=<key>` returns the expected business.
3. Copy `landing-page-client.js` into the landing page, construct `NorthstarLandingClient({ service: '<key>', apiBase: '<crm-origin>' })`, and use `manifest()`, `tenant()`, `publicContact()`, `catalog()`, `availability()`, `ownerPortalUrl()`, `ownerPasswordLogin()` when `integration.ownerAuthMethods` includes `password`, `ownerOidcLogin()` when it includes `oidc`, `refreshOwnerSession()`, `submitLead()`, and `book()` rather than duplicating endpoint paths.
4. Test one lead and one booking with a unique `Idempotency-Key`, confirm the owner portal shows the tenant-scoped records, and remove any preview/demo credentials before launch.

Example production mapping (replace every placeholder):

```env
NORTHSTAR_TENANTS_JSON='[{"slug":"acme-electric","businessName":"Acme Electric","serviceLabel":"Electrical","timeZone":"America/New_York"}]'
NORTHSTAR_SERVICE_TENANTS_JSON='{"electrician":"acme-electric"}'
NORTHSTAR_ALLOWED_ORIGINS=https://www.acmeelectric.example
```

The public `service` key is routing context, not authorization. Owner pages must use the authenticated login flow, and each attached business should have its own tenant mapping, owner account, allowed origin, and production data store.

For a ready-to-attach form, link to `/booking.html?service=plumbing`. The page loads the tenant label and slots, submits the same booking contract, and offers the customer a status link after success. It also carries bounded `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `gclid`, and `fbclid` query parameters into the booking so attribution survives the handoff. The manifest's `statusEndpoints` and `bookingResponseFields` identify the status and customer-portal actions without hard-coded assumptions. Copy the page into a landing site only when the API origin and CORS allowlist are configured for that site.

The endpoint is intentionally limited to lead intake. Owner records remain behind the authenticated session API, and the public service key is routing context—not authorization. Configure `NORTHSTAR_ALLOWED_ORIGINS` as a comma-separated allowlist in deployments where landing pages use browser cross-origin requests; the API handles `OPTIONS` preflight and rejects unlisted origins. Production deployments should also use durable storage, stronger abuse controls, and an identity provider for owner access.

When a lead is converted into a job, the owner response includes a short-lived `customerPortalToken`. Link the customer to `/status.html?token=...`; the page calls `GET /api/public/job-status?token=...` and shows only the job service, normalized appointment when available, technician, lifecycle status, and multi-visit progress when scheduled. Never expose owner tokens or tenant IDs in that link.

Owner-created estimates include an `estimateApprovalToken`. Link the customer to `/estimate.html?token=...`; the page lets them review the service and total and approve a draft estimate through the public approval endpoint. Invoice creation remains owner-only and requires the estimate to be accepted.

Technicians can create a draft estimate for newly discovered work from an assigned active job through the manifest's `technicianFieldEstimateEndpoint`; the API returns a signed customer approval token and records the job, customer, technician, amount, and finding note. After completion, both `/status.html?token=...` and `/customer.html?token=...` expose a signed 72-hour `/review.html?token=...` handoff. These links are customer-facing workflow tokens, not owner authentication credentials.
