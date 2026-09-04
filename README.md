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
- Tenant-scoped demo repository with persistent task completion, action state, and operational notifications
- Owner CSV exports for customer, lead, dispatch, estimate, invoice, plan, and activity workspaces
- Structured job completion with technician assignment, completion notes, timestamps, and timeline events
- Customer asset records with serial/install context and automatic timeline events
- Consolidated customer profiles spanning work history, equipment, billing, plans, and activity
- Secure 24-hour technician job links with mobile status updates and field completion
- Structured technician checklists required before mobile completion
- Secure 72-hour customer portal links with appointments, equipment, estimates, invoices, and service plans
- Signed post-job review links with one-time 1–5 rating and timeline capture
- Server-side technician conflict detection for assignment and rescheduling
- Service-plan renewal can schedule the next recurring visit and records the renewal event
- Invoice payments support partial collection, remaining balances, payment methods, and references
- Dispatch assignment, status changes, and rescheduling are recorded in the customer timeline
- Team roster availability and active-job counts are derived from live tenant jobs

## Run locally

This is intentionally dependency-free. Start the included API and static server directly with Node:

```powershell
node server.mjs
```

Then visit http://localhost:4173.

To preview a service-specific tenant, use `http://localhost:4173/?service=plumbing`, `powerwashing`, `electrician`, or `carwash`.

Run `node smoke-test.mjs` to launch an isolated temporary server and verify public intake, lead conversion, quote-to-cash, tenant isolation, and session revocation together. `npm run test:smoke` is also available when npm is configured.

See [PORTAL_CONTRACT.md](PORTAL_CONTRACT.md) before adding authentication, APIs, or landing-page integrations.

See [LANDING_PAGE_INTEGRATION.md](LANDING_PAGE_INTEGRATION.md) for the copyable form submission contract used by future service landing pages.

See [COMPETITIVE_RESEARCH.md](COMPETITIVE_RESEARCH.md) for the current ServiceTitan, Jobber, Housecall Pro, and FieldEdge benchmark and Northstar build order.

The current dashboard reads through `data-repository.js`. It is deliberately a browser-only demo adapter; replace it with the authenticated `/api/session` and `/api/dashboard` contract before using real customer or financial data.

Available local API routes include `GET /api/health`, `POST /api/auth/demo-login`, `POST /api/auth/logout`, `POST /api/public/leads`, `GET /api/public/job-status?token=...`, `GET /api/public/estimate?token=...`, `POST /api/public/estimate/approve?token=...`, `GET /api/public/technician-job?token=...`, `POST /api/public/technician-job/status?token=...`, `POST /api/public/technician-job/complete?token=...`, `GET /api/public/customer-portal?token=...`, `GET /api/public/review?token=...`, `POST /api/public/review?token=...`, `GET /api/session`, `GET /api/dashboard`, `GET /api/reports/overview`, `GET /api/export?type=customers`, `GET /api/team`, `GET /api/catalog`, `GET /api/notifications`, `GET /api/customers`, `GET /api/customers/:id`, `GET /api/assets`, `GET /api/leads`, `GET /api/estimates`, `GET /api/invoices`, `GET /api/plans`, `GET /api/activities`, `GET /api/dispatch`, `POST /api/customers`, `POST /api/assets`, `POST /api/leads`, `POST /api/leads/:id/convert`, `POST /api/jobs`, `POST /api/jobs/:id/assign`, `POST /api/jobs/:id/status`, `POST /api/jobs/:id/reschedule`, `POST /api/jobs/:id/complete`, `POST /api/jobs/:id/technician-link`, `POST /api/jobs/:id/customer-link`, `POST /api/jobs/:id/review-link`, `POST /api/plans`, `POST /api/plans/:id/renew`, `POST /api/activities`, `POST /api/estimates`, `POST /api/estimates/:id/approve`, `POST /api/invoices`, `POST /api/invoices/:id/pay`, `POST /api/tasks/:index`, and `POST /api/actions`. The demo API uses an HMAC-signed, short-lived token with in-memory revocation and persists local development state in the ignored `.northstar-data.json`; production must use a real identity provider, validation, rate limiting, spam controls, and durable tenant-scoped storage.

## Next product slices

The next implementation layer should replace demo auth with a real identity provider, add full customer/location/assets profiles, drag-and-drop dispatch, technician mobile workflows, payment-provider integration, and role-aware reporting. The current implementation provides the tenant-scoped API seams and local workflows future agents can extend safely.
