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

Supported service keys are `plumbing`, `powerwashing`, `electrician`, and `carwash`. A valid request returns `201` with `{ received: true, id, tenant }`. Repeating the same `Idempotency-Key` returns the original lead with `200` and `duplicate: true`, preventing retry-created duplicates. Missing or malformed email/phone contact information returns `422`; malformed or oversized JSON returns a controlled `400`; the honeypot and rate limit return `422` and `429` respectively.

Landing pages should resolve their service identity from `GET /api/public/tenant?service=plumbing`. The response includes an `integration` manifest with copyable `bookingPath`, `leadEndpoint`, `bookingEndpoint`, and `availabilityEndpoint` values plus capability flags; use those values instead of hard-coding service routes when an agent attaches a new landing page. Fetch the availability endpoint to render `slotOptions` (`id`, display `label`, UTC `startsAt`/`endsAt`, and IANA `timeZone`). The legacy `slots` label array remains available. Submit a selected slot to the manifest's `bookingEndpoint` with `{ name, phone, email, location, requestedService, slotId, time, source, checklist, website: '' }` and an `Idempotency-Key`; `slotId` is preferred and `time` remains a compatibility fallback. `location` is required for bookings so dispatch receives a routable service address; use lead intake when an address is not yet known. `checklist` is optional: when supplied, it may contain up to 12 short labels that become the technician's required completion steps for that booked job; omitted or invalid checklists use the safe default. A successful booking returns `201` with a tenant-scoped job ID, normalized appointment timestamps, and short-lived `customerPortalToken`; retries with the same payload and key return `200` and `duplicate: true`, while reusing a key for a different payload returns `409` with `idempotency_key_reused`. Availability removes slots occupied by active tenant jobs, so the landing page and booking validation share the same capacity check. The returned token can call `GET /api/public/job-status` for a safe appointment view and `POST /api/public/job-status/reschedule` with `{ slotId }` plus an `Idempotency-Key` to apply an available replacement slot. The current adapter supplies demo capacity; production should connect live timezone-aware availability and technician capacity.

For a ready-to-attach form, link to `/booking.html?service=plumbing`. The page loads the tenant label and slots, submits the same booking contract, and offers the customer a status link after success. Copy the page into a landing site only when the API origin and CORS allowlist are configured for that site.

The endpoint is intentionally limited to lead intake. Owner records remain behind the authenticated session API, and the public service key is routing context—not authorization. Configure `NORTHSTAR_ALLOWED_ORIGINS` as a comma-separated allowlist in deployments where landing pages use browser cross-origin requests; the API handles `OPTIONS` preflight and rejects unlisted origins. Production deployments should also use durable storage, stronger abuse controls, and an identity provider for owner access.

When a lead is converted into a job, the owner response includes a short-lived `customerPortalToken`. Link the customer to `/status.html?token=...`; the page calls `GET /api/public/job-status?token=...` and shows only the job service, normalized appointment when available, technician, and lifecycle status. Never expose owner tokens or tenant IDs in that link.

Owner-created estimates include an `estimateApprovalToken`. Link the customer to `/estimate.html?token=...`; the page lets them review the service and total and approve a draft estimate through the public approval endpoint. Invoice creation remains owner-only and requires the estimate to be accepted.
