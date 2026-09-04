# Northstar CRM

Northstar is a polished, responsive CRM dashboard concept for field-service businesses. It is designed around the operator's real day: understand revenue, follow up on the right opportunities, see technician capacity, and keep every customer interaction connected.

## Included in this MVP

- Revenue, jobs, estimates, and customer satisfaction KPIs
- Revenue pipeline with stage values
- Today's focus list with interactive task completion
- Schedule view with job status, technician assignment, and customer context
- Recent activity stream
- Responsive layout for desktop and mobile
- Configuration-driven service verticals for plumbing, power washing, electrical, and mobile car wash
- Demo owner-portal handoff with an explicit production auth boundary
- Owner action cards for estimate recovery, overdue cash, and recurring-service retention
- Tenant-scoped demo repository with persistent task completion and action state

## Run locally

This is intentionally dependency-free. Start the included API and static server directly with Node:

```powershell
node server.mjs
```

Then visit http://localhost:4173.

To preview a service-specific tenant, use `http://localhost:4173/?service=plumbing`, `powerwashing`, `electrician`, or `carwash`.

See [PORTAL_CONTRACT.md](PORTAL_CONTRACT.md) before adding authentication, APIs, or landing-page integrations.

See [COMPETITIVE_RESEARCH.md](COMPETITIVE_RESEARCH.md) for the current ServiceTitan, Jobber, Housecall Pro, and FieldEdge benchmark and Northstar build order.

The current dashboard reads through `data-repository.js`. It is deliberately a browser-only demo adapter; replace it with the authenticated `/api/session` and `/api/dashboard` contract before using real customer or financial data.

Available local API routes include `GET /api/health`, `POST /api/auth/demo-login`, `POST /api/public/leads`, `GET /api/session`, `GET /api/dashboard`, `GET /api/reports/overview`, `GET /api/customers`, `GET /api/leads`, `GET /api/estimates`, `GET /api/invoices`, `GET /api/plans`, `GET /api/activities`, `GET /api/dispatch`, `POST /api/customers`, `POST /api/leads`, `POST /api/leads/:id/convert`, `POST /api/jobs`, `POST /api/jobs/:id/assign`, `POST /api/jobs/:id/status`, `POST /api/plans`, `POST /api/plans/:id/renew`, `POST /api/activities`, `POST /api/estimates`, `POST /api/estimates/:id/approve`, `POST /api/invoices`, `POST /api/invoices/:id/pay`, `POST /api/tasks/:index`, and `POST /api/actions`. The demo API uses an HMAC-signed, short-lived token and persists local development state in the ignored `.northstar-data.json`; production must use a real identity provider, validation, rate limiting, spam controls, and durable tenant-scoped storage.

## Next product slices

The next implementation layer should add persistent data and auth, customer profiles with a full timeline, drag-and-drop dispatch, estimate creation, technician mobile workflows, and role-aware reporting. The current UI is a frontend foundation with a clear component/data boundary for that work.
