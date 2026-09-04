# Landing page integration

Use the public lead endpoint from a service landing page. The service key can be sent in the JSON body or in the page URL, for example `/api/public/leads?service=plumbing`.

```js
await fetch('https://crm.example.com/api/public/leads?service=plumbing', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
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

Supported service keys are `plumbing`, `powerwashing`, `electrician`, and `carwash`. A valid request returns `201` with `{ received: true, id, tenant }`. Missing contact information returns `422`; the honeypot and rate limit return `422` and `429` respectively.

The endpoint is intentionally limited to lead intake. Owner records remain behind the authenticated session API, and the public service key is routing context—not authorization. Production deployments should place the endpoint behind an allowlisted origin, durable storage, stronger abuse controls, and an identity provider for owner access.

When a lead is converted into a job, the owner response includes a short-lived `customerPortalToken`. Link the customer to `/status.html?token=...`; the page calls `GET /api/public/job-status?token=...` and shows only the job service, appointment time, technician, and lifecycle status. Never expose owner tokens or tenant IDs in that link.
