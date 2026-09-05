# Northstar CRM

[![Northstar CRM checks](https://github.com/PsychoPanda1/northstar-crm/actions/workflows/ci.yml/badge.svg)](https://github.com/PsychoPanda1/northstar-crm/actions/workflows/ci.yml)

Northstar is a polished, responsive CRM dashboard concept for field-service businesses. It is designed around the operator's real day: understand revenue, follow up on the right opportunities, see technician capacity, and keep every customer interaction connected.

## Included in this MVP

- Revenue, jobs, estimates, and customer satisfaction KPIs
- Revenue pipeline with stage values
- Today's focus list with interactive task completion
- Schedule view with job status, technician assignment, and customer context
- Recent activity stream
- Responsive layout for desktop and mobile
- Configuration-driven service verticals for plumbing, power washing, electrical, and mobile car wash
- Configurable secure owner-portal handoff with a local demo fallback and explicit production auth boundary
- Owner action cards for estimate recovery, overdue cash, and recurring-service retention
- Tenant-scoped demo repository with persistent task completion, action state, and operational notifications
- Owner CSV exports for customer, lead, dispatch, estimate, invoice, plan, and activity workspaces
- Structured job completion with technician assignment, completion notes, timestamps, and timeline events
- Customer asset records with serial/install context and automatic timeline events
- Consolidated customer profiles spanning work history, equipment, billing, plans, and activity
- Multi-location customer records for commercial and repeat-service accounts
- Secure 24-hour technician job links with mobile status updates and field completion
- Technician links can capture field labor hours and consume stocked materials against the assigned job
- Structured technician checklists required before mobile completion
- Technician photo evidence with bounded HTTPS metadata, captions, timestamps, and owner-visible job records
- Offline-capable technician field actions that queue locally and replay when connectivity returns
- Tenant-scoped audit log with searchable CSV export for workflow and integration traceability
- Configurable tenant pricebook items for consistent service quoting across landing pages and the owner portal
- Explainable technician recommendations based on active workload and appointment conflicts
- Technician-initiated Card/ACH payment intents scoped to the assigned job invoice
- Customer appointment confirmation through signed portal links with timeline visibility
- Dispatch-triggered confirmation, en-route, and completion message templates linked to jobs
- Rescheduling an appointment queues a customer-facing reschedule notification and timeline event
- Automatic customer notifications when jobs are assigned, en route, or completed, with deduplication before provider delivery
- Landing-page availability and idempotent online booking into the dispatch queue
- Repeat online bookings match the tenant customer by email or normalized phone so history is not fragmented across appointments
- Reusable `booking.html` customer form for service-specific landing pages
- Pricebook-linked estimates preserve the quoted service snapshot for reliable quote-to-cash records
- Multi-option estimates let customers select a clearly labeled service tier before approval
- Secure 72-hour customer portal links with appointments, equipment, estimates, invoices, and service plans
- Signed post-job review links with one-time 1–5 rating and timeline capture
- Owner review workspace with searchable review history and CSV export
- Review ratings feed dashboard satisfaction and owner reporting
- Demo role permissions for owner, dispatcher, technician, and accountant workflows
- Field permissions are separated from dispatch administration so technicians cannot create or reassign jobs
- Tenant-scoped inventory with stock receipts, job material consumption, reorder thresholds, and CSV export
- Purchase orders with vendor, receiving, and automatic stock reconciliation
- Job profitability workspace combining material cost, logged labor, revenue, and gross margin
- Labor entries feed customer timelines and job-cost reporting
- Structured SMS/email message queue with explicit provider-pending status and timeline capture
- Durable session revocation survives API restarts in the local adapter
- New landing-page leads appear in the owner action queue for immediate follow-up
- Lead pipeline statuses can be advanced or marked lost with an auditable note before conversion
- Owners and dispatchers can queue deduplicated SMS/email follow-ups for open estimates
- Landing-page retries can use an idempotency key to prevent duplicate leads
- Owners can acknowledge active notifications while preserving the source record
- Customers can submit reschedule, cancellation, or question requests from the self-service portal
- Accepted estimates can convert directly into scheduled, checklist-ready jobs
- Server-side technician conflict detection for assignment and rescheduling
- Server-enforced job lifecycle transitions prevent invalid field states and bypassing completion requirements
- Service-plan renewal can schedule the next recurring visit and records the renewal event
- Service plans support auditable pause, resume, and cancellation lifecycle controls
- Invoice payments support partial collection, remaining balances, payment methods, and references
- Invoice installment schedules support deposits and milestone payments while deriving paid progress from the payment ledger
- Signed customer invoice links create idempotent provider-pending payment intents without claiming settlement
- Owners can generate secure invoice payment links directly from the invoice workspace
- Owners and accountants can queue deduplicated invoice balance reminders from the invoice workspace
- Customer portal invoices now expose secure payment actions scoped to the customer token
- Signed payment webhooks reconcile provider-confirmed intents into invoices and the payment ledger idempotently
- Payment ledger records are searchable and exportable for reconciliation
- Dispatch assignment, status changes, and rescheduling are recorded in the customer timeline
- Team roster availability and active-job counts are derived from live tenant jobs
- Owners and dispatchers can add tenant-specific technicians or staff members to the roster

## Run locally

### Run as a container

Build and run the server with a persistent data volume:

```sh
docker build -t northstar-crm .
docker run --rm -p 4173:4173 -v northstar-data:/app/data \
  -e NORTHSTAR_SESSION_SECRET="replace-with-a-long-random-secret" \
  northstar-crm
```

The image runs as the unprivileged `node` user, stores local state under `/app/data`, and exposes `/api/health` as its container health check. Configure owner authentication and payment webhook secrets through deployment environment variables; do not bake credentials into the image.

To generate `NORTHSTAR_OWNER_PASSWORD_DIGEST` without putting the password in shell history, set `NORTHSTAR_SESSION_SECRET` in the environment and run `node scripts/generate-owner-digest.mjs`; store the printed digest only in the deployment secret configuration.

This is intentionally dependency-free. Start the included API and static server directly with Node:

```powershell
node server.mjs
```

Then visit http://localhost:4173.

To preview a service-specific tenant, use `http://localhost:4173/portal?service=plumbing`, `powerwashing`, `electrician`, or `carwash` (the root URL remains supported).

Run `node smoke-test.mjs` to launch an isolated temporary server and verify public intake, lead conversion, quote-to-cash, tenant isolation, and session revocation together. `npm run test:smoke` is also available when npm is configured.

See [PORTAL_CONTRACT.md](PORTAL_CONTRACT.md) before adding authentication, APIs, or landing-page integrations.

See [LANDING_PAGE_INTEGRATION.md](LANDING_PAGE_INTEGRATION.md) for the copyable form submission contract used by future service landing pages.

See [COMPETITIVE_RESEARCH.md](COMPETITIVE_RESEARCH.md) for the current ServiceTitan, Jobber, Housecall Pro, and FieldEdge benchmark and Northstar build order.

The current dashboard reads through `data-repository.js`. It can preview through the demo adapter, or use the configured owner-login seam when `NORTHSTAR_OWNER_EMAIL` and `NORTHSTAR_OWNER_PASSWORD_DIGEST` are set. The password digest is the SHA-256 HMAC hex digest of the password using `NORTHSTAR_SESSION_SECRET` as the key; credentials remain server-side. Production should replace this local credential seam with an identity provider while preserving the authenticated `/api/session` and `/api/dashboard` contract. Landing pages can use `/api/public/tenant`, `/api/public/availability`, and `/api/public/bookings` as the shared multi-service integration boundary.

Available local API routes include `GET /api/health`, `POST /api/auth/demo-login`, `POST /api/auth/logout`, `POST /api/public/leads`, `GET /api/public/job-status?token=...`, `GET /api/public/estimate?token=...`, `POST /api/public/estimate/approve?token=...`, `GET /api/public/technician-job?token=...`, `POST /api/public/technician-job/status?token=...`, `POST /api/public/technician-job/complete?token=...`, `GET /api/public/customer-portal?token=...`, `GET /api/public/review?token=...`, `POST /api/public/review?token=...`, `GET /api/session`, `GET /api/dashboard`, `GET /api/reports/overview`, `GET /api/export?type=customers`, `GET /api/team`, `GET /api/catalog`, `POST /api/catalog`, `GET /api/notifications`, `GET /api/audit`, `GET /api/customers`, `GET /api/customers/:id`, `GET /api/assets`, `GET /api/leads`, `GET /api/estimates`, `GET /api/invoices`, `GET /api/plans`, `GET /api/activities`, `GET /api/dispatch`, `POST /api/customers`, `POST /api/assets`, `POST /api/leads`, `POST /api/leads/:id/convert`, `POST /api/jobs`, `POST /api/jobs/:id/assign`, `POST /api/jobs/:id/status`, `POST /api/jobs/:id/reschedule`, `POST /api/jobs/:id/complete`, `POST /api/jobs/:id/technician-link`, `POST /api/jobs/:id/customer-link`, `POST /api/jobs/:id/review-link`, `POST /api/plans`, `POST /api/plans/:id/renew`, `POST /api/activities`, `POST /api/estimates`, `POST /api/estimates/:id/approve`, `POST /api/invoices`, `POST /api/invoices/:id/pay`, `POST /api/tasks/:index`, and `POST /api/actions`. The demo API uses an HMAC-signed, short-lived token with in-memory revocation and persists local development state in the ignored `.northstar-data.json`; production must use a real identity provider, validation, rate limiting, spam controls, and durable tenant-scoped storage.

Additional current routes include `POST /api/auth/login`, `GET /api/public/tenant`, `GET /api/public/availability`, `POST /api/public/bookings`, `POST /api/team`, and `GET|POST /api/invoices/:id/schedule`. See [PORTAL_CONTRACT.md](PORTAL_CONTRACT.md) for request shapes, role boundaries, and customer-safe response rules.

## Next product slices

The next implementation layer is production hardening: replace the local credential seam with a real identity provider, move JSON state and session revocation to durable managed storage, connect real SMS/email/payment providers, and replace prototype relative-time slots with timezone-aware capacity. The current local API already provides server-enforced role permissions, tenant isolation, restart-safe revocation, signed payment webhooks, customer/technician portals, scheduling conflict checks, and container deployment boundaries. The technician offline queue remains device-local for this prototype; production should use encrypted managed offline storage plus an explicit conflict policy.
