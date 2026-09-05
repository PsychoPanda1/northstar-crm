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
- Customer asset records with durable customer links, serial/install context, retry-safe creation, and automatic timeline events
- Consolidated customer profiles spanning work history, equipment, billing, plans, and activity
- Owner notes, equipment, and estimates use an explicit tenant-scoped customer picker so same-name accounts cannot be accidentally merged
- Multi-location customer records for commercial and repeat-service accounts
- Secure 24-hour technician job links with mobile status updates and field completion
- Technician links can capture field labor hours and consume stocked materials against the assigned job
- Technicians can clock in/out across multiple sessions on an in-progress job; elapsed field minutes are aggregated with audit events
- Job-cost records expose tracked field minutes/hours while keeping billable labor rates separate
- Structured technician checklists required before mobile completion
- Owners and dispatchers can revise a job checklist before field work begins, with audit history and server-enforced locking after start
- All API and static responses receive a browser security baseline; production mode additionally enables HSTS
- CI runs a Node 20/22 verification matrix with a ten-minute timeout, stale-run cancellation, and manual reruns
- Technician photo evidence with bounded HTTPS metadata, captions, timestamps, and owner-visible job records
- Offline-capable technician field actions that queue locally and replay when connectivity returns
- Tenant-scoped audit log with searchable CSV export for workflow and integration traceability
- Configurable tenant pricebook items for consistent service quoting across landing pages and the owner portal
- Explainable technician recommendations based on active workload and appointment conflicts
- Skill-aware technician recommendations and server-side assignment enforcement
- Technician-initiated Card/ACH payment intents scoped to the assigned job invoice
- Customer appointment confirmation through signed portal links with timeline visibility
- Dispatch-triggered confirmation, en-route, and completion message templates linked to jobs
- Owner/dispatcher no-show recording with reason, timeline, and audit evidence
- Rescheduling an appointment queues a customer-facing reschedule notification and timeline event
- Owners and dispatchers can queue deduplicated appointment reminders before a visit
- Automatic customer notifications when jobs are assigned, en route, or completed, with deduplication before provider delivery
- Customer status links and portals expose the recorded technician en-route timestamp when available
- Landing-page availability and idempotent online booking into the dispatch queue
- Environment-driven tenant and service routing supports adding new landing-page businesses without changing server source
- Office-created jobs can carry normalized appointment ranges, with overlap-aware capacity conflict checks
- Dispatch rescheduling can target a stable availability slot while preserving normalized appointment timestamps
- Repeat online bookings match the tenant customer by email or normalized phone so history is not fragmented across appointments
- Reusable `booking.html` customer form for service-specific landing pages
- Pricebook-linked estimates preserve the quoted service snapshot for reliable quote-to-cash records
- Multi-option estimates let customers select a clearly labeled service tier before approval
- Estimates can calculate subtotal, discounts, tax, and final total on the server
- Customer estimate approvals capture the typed approver name in the estimate and audit ledger
- Secure 72-hour customer portal links with appointments, equipment, estimates, invoices, and service plans
- Signed post-job review links with one-time 1–5 rating and timeline capture
- Owner review workspace with searchable review history and CSV export
- Review ratings feed dashboard satisfaction and owner reporting
- Demo role permissions for owner, dispatcher, technician, and accountant workflows
- Field permissions are separated from dispatch administration so technicians cannot create or reassign jobs
- Technician field writes are restricted to their assigned jobs; inventory management remains an owner/dispatcher capability
- Tenant-scoped inventory with stock receipts, job material consumption, reorder thresholds, and CSV export
- Purchase orders with vendor, receiving, and automatic stock reconciliation
- Tenant-scoped inventory transaction ledger with searchable owner view and CSV export
- Job profitability workspace combining material cost, logged labor, revenue, and gross margin
- Reports summarize estimate close rate, memberships sold, no-shows, tracked field hours, material spend, logged labor cost, and gross margin, with CSV export for owner handoff
- Labor entries feed customer timelines and job-cost reporting
- Structured SMS/email message queue with explicit provider-pending status and timeline capture
- Signed inbound SMS/email replies can be matched to customers and optional jobs for two-way communication history
- Owners and dispatchers can reply to inbound customer messages from the message ledger with idempotent provider-pending delivery
- Inbound customer messages create owner action notifications with tenant-scoped read state
- Durable session revocation survives API restarts in the local adapter
- New landing-page leads appear in the owner action queue for immediate follow-up
- Lead pipeline statuses can be advanced or marked lost with an auditable note before conversion
- Owners and dispatchers can queue deduplicated SMS/email follow-ups for open estimates
- Landing-page retries can use an idempotency key to prevent duplicate leads
- Owners can acknowledge active notifications while preserving the source record
- Customers can submit reschedule, cancellation, or question requests from the self-service portal
- Customer self-service requests accept idempotency keys so mobile retries do not create duplicate requests
- Accepted estimates can convert directly into scheduled, checklist-ready jobs
- Server-side technician conflict detection for assignment and rescheduling
- Multi-visit work orders with per-visit scheduling, technician assignment, and conflict checks
- Per-visit lifecycle transitions for multi-visit work orders
- Server-enforced job lifecycle transitions prevent invalid field states and bypassing completion requirements
- Service-plan renewal can schedule the next recurring visit using the same timezone-aware capacity slots as public booking
- Service plans support auditable pause, resume, and cancellation lifecycle controls
- Invoice payments support partial collection, remaining balances, payment methods, and references
- Invoice installment schedules support deposits and milestone payments while deriving paid progress from the payment ledger
- Signed customer invoice links create idempotent provider-pending payment intents without claiming settlement
- Owners can generate secure invoice payment links directly from the invoice workspace
- Owners and accountants can queue deduplicated invoice balance reminders from the invoice workspace
- Customer portal invoices now expose secure payment actions scoped to the customer token
- Signed payment webhooks reconcile provider-confirmed intents into invoices and the payment ledger idempotently
- Payment ledger records are searchable and exportable for reconciliation
- Accounting reconciliation CSV combines persisted invoice balances with settled payments for owner/accountant handoff
- Dispatch assignment, status changes, and rescheduling are recorded in the customer timeline
- Team roster availability and active-job counts are derived from live tenant jobs
- Owners and dispatchers can add tenant-specific technicians or staff members to the roster
- Customer assets support an optional validated warranty-through date, customer-portal visibility, and an auditable creation event
- Warranty dates within 30 days automatically surface as owner follow-up notifications
- Completed jobs can expose technician completion notes and bounded HTTPS photo evidence in the customer portal
- Technicians can optionally record the customer acknowledgment name at completion, with the acknowledgment preserved in the portal and timeline

## Run locally

### Run as a container

Build and run the server with a persistent data volume:

```sh
docker build -t northstar-crm .
docker run --rm -p 4173:4173 -v northstar-data:/app/data \
  -e NORTHSTAR_SESSION_SECRET="replace-with-a-long-random-secret" \
  northstar-crm
```

The image runs as the unprivileged `node` user in production mode, stores local state under `/app/data`, and exposes `/api/ready` as its container readiness check. Readiness requires a non-default session secret, configured owner/staff authentication, and both webhook secrets; configure these through deployment environment variables and do not bake credentials into the image. Demo login is disabled in production unless `NORTHSTAR_ALLOW_DEMO_LOGIN=true` is explicitly set for an isolated preview or smoke environment.

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

The current dashboard reads through `data-repository.js`. It can preview through the demo adapter, or use configured owner/staff credentials when `NORTHSTAR_OWNER_EMAIL`, `NORTHSTAR_OWNER_PASSWORD_DIGEST`, and `NORTHSTAR_OWNER_TENANT_ID` or `NORTHSTAR_STAFF_JSON` are set. If production disables demo login, the browser keeps the API login path available for those configured credentials instead of treating the API as unavailable. Staff entries are tenant-bound and carry only server-side HMAC password digests; credentials never reach landing pages. Production should replace this local credential seam with an identity provider while preserving the authenticated `/api/session` and `/api/dashboard` contract. Landing pages can use `/api/public/tenant`, `/api/public/availability`, and `/api/public/bookings` as the shared multi-service integration boundary.

Available local API routes include `GET /api/health`, `POST /api/auth/demo-login`, `POST /api/auth/logout`, `POST /api/public/leads`, `GET /api/public/job-status?token=...`, `GET /api/public/estimate?token=...`, `POST /api/public/estimate/approve?token=...`, `GET /api/public/technician-job?token=...`, `POST /api/public/technician-job/status?token=...`, `GET|POST /api/public/technician-job/clock?token=...`, `POST /api/public/technician-job/complete?token=...`, `GET /api/public/customer-portal?token=...`, `GET /api/public/review?token=...`, `POST /api/public/review?token=...`, `GET /api/session`, `GET /api/dashboard`, `GET /api/reports/overview`, `GET /api/export?type=customers`, `GET /api/team`, `GET /api/catalog`, `POST /api/catalog`, `GET /api/notifications`, `GET /api/audit`, `GET /api/customers`, `GET /api/customers/:id`, `GET /api/assets`, `GET /api/leads`, `GET /api/estimates`, `GET /api/invoices`, `GET /api/plans`, `GET /api/activities`, `GET /api/dispatch`, `GET /api/materials`, `GET /api/purchase-orders`, `GET /api/inventory-transactions`, `GET /api/job-costs`, `GET /api/messages`, `POST /api/customers`, `POST /api/assets`, `POST /api/leads`, `POST /api/leads/:id/convert`, `POST /api/jobs`, `POST /api/jobs/:id/assign`, `POST /api/jobs/:id/status`, `POST /api/jobs/:id/reschedule`, `POST /api/jobs/:id/complete`, `POST /api/jobs/:id/technician-link`, `POST /api/jobs/:id/customer-link`, `POST /api/jobs/:id/review-link`, `POST /api/plans`, `POST /api/plans/:id/renew`, `POST /api/activities`, `POST /api/estimates`, `POST /api/estimates/:id/approve`, `POST /api/invoices`, `POST /api/invoices/:id/pay`, `POST /api/tasks/:index`, and `POST /api/actions`. The demo API uses an HMAC-signed, short-lived token with in-memory revocation and persists local development state in the ignored `.northstar-data.json`; production must use a real identity provider, validation, rate limiting, spam controls, and durable tenant-scoped storage.

Additional current routes include `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/integrations/health`, `GET /api/public/tenant`, `GET /api/public/availability`, `POST /api/public/bookings`, `GET /api/dispatch/route-manifest`, `POST /api/dispatch/reminders`, `POST /api/messages/:id/retry`, `POST /api/payment-intents/:id/retry`, `GET /api/jobs/:id`, `GET /api/jobs/:id/calendar`, `POST /api/team`, and `GET|POST /api/invoices/:id/schedule`. See [PORTAL_CONTRACT.md](PORTAL_CONTRACT.md) for request shapes, role boundaries, and customer-safe response rules.

## Next product slices

The next implementation layer is production hardening: replace the local credential seam with a real identity provider, move JSON state and session revocation to durable managed storage, connect real SMS/email/payment providers, and replace prototype relative-time slots with timezone-aware capacity. The current local API already provides server-enforced role permissions, tenant isolation, restart-safe revocation, signed payment webhooks, customer/technician portals, scheduling conflict checks, and container deployment boundaries. The technician offline queue remains device-local for this prototype; production should use encrypted managed offline storage plus an explicit conflict policy.
