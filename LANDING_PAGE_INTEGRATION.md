# Landing page integration

Use the public lead endpoint from a service landing page. The service key can be sent in the JSON body or in the page URL, for example `/api/public/leads?service=plumbing`.

```js
await fetch('https://crm.example.com/api/public/leads?service=plumbing', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
  body: JSON.stringify({
    name: form.name,
    phone: form.phone,
    email: form.email,
    requestedService: 'Emergency leak repair',
    source: 'Clearwater Plumbing landing page',
    website: '' // honeypot; keep empty for real visitors
  })
});
```

Supported service keys are `plumbing`, `powerwashing`, `electrician`, and `carwash`. A valid request returns `201` with `{ received: true, id, tenant }`. Repeating the same `Idempotency-Key` returns the original lead with `200` and `duplicate: true`, preventing retry-created duplicates. Missing contact information returns `422`; malformed or oversized JSON returns a controlled `400`; the honeypot and rate limit return `422` and `429` respectively.

Landing pages may offer online booking with the same service key. Fetch `GET /api/public/availability?service=plumbing` to render the returned `slots`, then submit a selected slot to `POST /api/public/bookings?service=plumbing` with `{ name, phone, email, location, requestedService, time, source, website: '' }` and an `Idempotency-Key`. A successful booking returns `201` with a tenant-scoped job ID and short-lived `customerPortalToken`; retries with the same key return `200` and `duplicate: true`. The prototype exposes deterministic slot labels; production should replace them with live capacity and timezone-aware availability.

The endpoint is intentionally limited to lead intake. Owner records remain behind the authenticated session API, and the public service key is routing context—not authorization. Configure `NORTHSTAR_ALLOWED_ORIGINS` as a comma-separated allowlist in deployments where landing pages use browser cross-origin requests; the API handles `OPTIONS` preflight and rejects unlisted origins. Production deployments should also use durable storage, stronger abuse controls, and an identity provider for owner access.

When a lead is converted into a job, the owner response includes a short-lived `customerPortalToken`. Link the customer to `/status.html?token=...`; the page calls `GET /api/public/job-status?token=...` and shows only the job service, appointment time, technician, and lifecycle status. Never expose owner tokens or tenant IDs in that link.

Owner-created estimates include an `estimateApprovalToken`. Link the customer to `/estimate.html?token=...`; the page lets them review the service and total and approve a draft estimate through the public approval endpoint. Invoice creation remains owner-only and requires the estimate to be accepted.
