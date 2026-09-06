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
- Signed inbound call tracking with customer/job matching, unknown-caller lead creation, missed-call handling, owner call ledger, and CSV export
- Dispatch capacity planning with technician/day targets, planned minutes, remaining capacity, and utilization
- Marketing source reporting summarizes landing-page leads, conversions, conversion rate, and attributed lead value
- Landing-page campaign attribution preserves bounded UTM and click-ID context on public leads and booked jobs for source-aware follow-up
- Campaign-level marketing performance is available in the owner portal and as a tenant-scoped CSV export
- Accounts-receivable aging shows open balances by due-date bucket plus customer-level collection priorities
- Open receivables can be exported as a tenant-scoped collection-worklist CSV
- Owner/dispatcher reactivation campaigns queue deduplicated SMS/email follow-ups for customers without a recent completed service, with optional internal-tag targeting
- Tenant-scoped demo repository with persistent task completion, action state, and operational notifications
- Owner CSV exports for customer, lead, dispatch, estimate, invoice, plan, and activity workspaces
- Structured job completion with technician assignment, completion notes, timestamps, and timeline events
- Customer asset records with durable customer links, serial/install context, retry-safe creation, and automatic timeline events
- Consolidated customer profiles spanning work history, equipment, billing, plans, and activity
- Tenant-scoped customer import supports dry-run validation, normalized contact matching, bounded batches, and idempotent migration retries
- Owner notes, equipment, and estimates use an explicit tenant-scoped customer picker so same-name accounts cannot be accidentally merged
- Multi-location customer records for commercial and repeat-service accounts
- Owner-managed customer tags support internal segmentation without leaking CRM metadata to customer portals
- Customer contact preferences enforce SMS/email opt-outs for direct messages, appointment notifications, and reactivation campaigns
- Secure 24-hour technician job links with mobile status updates and field completion
- Technician links can capture field labor hours and consume stocked materials against the assigned job
- Crew members can receive individually scoped technician links while visit-level actions remain assigned to the designated visit technician
- Technicians can clock in/out across multiple sessions on an in-progress job; elapsed field minutes are aggregated with audit events
- Job-cost records expose tracked field minutes/hours while keeping billable labor rates separate
- Structured technician checklists required before mobile completion
- Owners and dispatchers can revise a job checklist before field work begins, with audit history and server-enforced locking after start
- All API and static responses receive a browser security baseline; production mode additionally enables HSTS
- CI runs a Node 20/22 verification matrix with a ten-minute timeout, stale-run cancellation, manual reruns, and a production-configured container readiness smoke check
- Technician photo evidence with bounded HTTPS metadata, captions, timestamps, and owner-visible job records
- Technicians can capture structured field findings with severity and recommended follow-up, preserving onsite upsell and safety context for owner review
- Field findings generate tenant-scoped owner action notifications, with safety findings marked urgent for dispatch follow-up
- Technicians can add equipment records from the field, carrying model/serial, install, warranty, and source-job history into the customer profile
- Technician job forms capture inspection results, notes, and optional customer acknowledgment for office review
- Owners and dispatchers can require named digital forms on a job, and closeout enforces completion of those forms
- Internal job handoff notes give dispatchers and assigned technicians a durable, audit-recorded place for access details and field context without exposing notes to customers
- Owners and dispatchers can create job-linked change-order estimates for approved scope additions, preserving the originating job and audit trail
- Customer portals label change-order estimates separately and show the scope note before approval
- Failed or follow-up job forms create urgent or actionable owner notifications linked to the source job
- Offline-capable technician field actions that queue locally with stable idempotency keys, replay when connectivity returns, and surface permanent conflicts or expired links for review instead of retrying forever
- Installable owner and technician workspaces with an offline shell that never caches authenticated customer/job data or API responses
- Tenant-scoped audit log with searchable CSV export for workflow and integration traceability
- Three-way purchase reconciliation with vendor-invoice matching, quantity/price/vendor flags, and exception review
- Tenant-scoped fleet vehicles with license-plate uniqueness, idempotent creation, lifecycle status, schedule-conflict checks, and dispatch assignment controls
- Multi-technician job crews with primary-technician compatibility, skill validation, schedule-conflict checks, and audit history
- Configurable tenant pricebook items for consistent service quoting across landing pages and the owner portal, including category, default duration, and taxable metadata
- Owner/dispatcher pricebook lifecycle controls update or archive persisted services without rewriting historical estimate snapshots; archived items remain restorable internally and disappear from public booking
- Explainable technician recommendations based on active workload and appointment conflicts
- Skill-aware technician recommendations and server-side assignment enforcement
- Technician-initiated Card/ACH payment intents scoped to the assigned job invoice
- Technicians can create idempotent field estimates for newly discovered work, preserving the assigned job, customer, technician, finding note, and owner-review status
- Customer appointment confirmation through signed portal links with timeline visibility
- Privacy-safe technician tracking heartbeat with customer-safe live-status metadata and owner audit evidence
- Dispatch-triggered confirmation, en-route, and completion message templates linked to jobs
- Owner/dispatcher no-show recording with reason, timeline, and audit evidence
- No-show recovery from the dispatch board and owner action queue with available-slot and technician-conflict checks
- Rescheduling an appointment queues a customer-facing reschedule notification and timeline event
- Customers can self-service a new appointment after a no-show through their signed status or portal link
- Owners and dispatchers can queue deduplicated appointment reminders before a visit
- Automatic customer notifications when jobs are assigned, en route, or completed, with deduplication before provider delivery
- Customer status links and portals expose the recorded technician en-route timestamp when available
- Landing-page availability and idempotent online booking into the dispatch queue
- Environment-driven tenant and service routing supports adding new landing-page businesses without changing server source
- Configured tenants can expose booking start/end hours, slot intervals, operating weekdays, and blackout dates through `NORTHSTAR_TENANTS_JSON`; the landing manifest publishes the active booking window
- Tenant-bound owner account configuration supports separate production logins for each attached landing-page business
- Office-created jobs can carry normalized appointment ranges, with overlap-aware capacity conflict checks
- The owner new-job workflow loads tenant-specific available slots and writes the selected normalized UTC range back into the work order
- Dispatch rescheduling can target a stable availability slot while preserving normalized appointment timestamps
- Repeat online bookings match the tenant customer by email or normalized phone so history is not fragmented across appointments
- Reusable `booking.html` customer form for service-specific landing pages
- Pricebook-linked estimates preserve the quoted service snapshot for reliable quote-to-cash records; optional expiration dates prevent stale quotes from being delivered or approved
- Multi-option estimates let customers select a clearly labeled service tier before approval
- Estimates can calculate subtotal, discounts, tax, and final total on the server
- Customer estimate approvals capture the typed approver name in the estimate and audit ledger
- Customer estimate change requests route directly into the owner action queue
- Owners can revise change-requested estimates and resend the updated scope
- Customers can decline estimates with a bounded reason that becomes an auditable pipeline outcome
- Secure 72-hour customer portal links with appointments, equipment, estimates, invoices, service plans, self-service rescheduling, and confirmed appointment cancellation
- Customer portal users can manage SMS/email contact preferences without exposing those flags in the general portal payload
- Signed post-job review links with one-time 1–5 rating and timeline capture
- Owner review workspace with searchable review history and CSV export
- Review ratings feed dashboard satisfaction and owner reporting
- Demo role permissions for owner, dispatcher, technician, and accountant workflows
- Role-aware portal navigation hides actions the authenticated staff role cannot use while API authorization remains server-enforced
- Field permissions are separated from dispatch administration so technicians cannot create or reassign jobs
- Technician field writes are restricted to their assigned jobs; inventory management remains an owner/dispatcher capability
- Tenant-scoped inventory with stock receipts, job material consumption, reorder thresholds, and CSV export
- Inventory locations for warehouses and service trucks with auditable, idempotent stock transfers while preserving total on-hand quantities
- Purchase orders with owner approval, vendor, receiving, and automatic stock reconciliation
- Tenant-scoped inventory transaction ledger with searchable owner view and CSV export
- Job profitability workspace combining material cost, logged labor, revenue, and gross margin
- Technician performance reporting compares completion, no-shows, field hours, revenue, cost, and gross margin by technician
- Payroll-ready technician commission reporting with owner-controlled commission rates, date-bounded reports, and CSV handoff
- Marketing and technician performance reports are exportable as owner-scoped CSVs
- Reports summarize estimate close rate, memberships sold, no-shows, tracked field hours, material spend, logged labor cost, and gross margin, with CSV export for owner handoff
- Labor entries feed customer timelines and job-cost reporting
- Structured SMS/email message queue with explicit provider-pending status, server-side provider dispatch, and timeline capture
- Optional server-side reminder worker runs appointment, estimate, receivables, and renewal automations on a bounded cadence with deduplication, opt-out enforcement, and audit evidence
- When providers are configured, the worker also submits queued messages and payment intents automatically; invoice settlement still requires a signed provider webhook
- The same opt-in worker can create tenant-local recurring-plan invoices after `NORTHSTAR_PLAN_BILLING_DAY` (1–28), with durable period guards; leave it at `0` for manual billing
- Signed inbound SMS/email replies can be matched to customers and optional jobs for two-way communication history
- Exact inbound SMS STOP-style replies automatically record SMS opt-out consent changes with audit history
- Owners and dispatchers can reply to inbound customer messages from the message ledger with idempotent provider-pending delivery
- Inbound customer messages create owner action notifications with tenant-scoped read state
- Durable session revocation survives API restarts in the local adapter
- Startup recovery loads the newest valid primary or interrupted temporary snapshot, preventing a malformed or stale primary JSON file from discarding recoverable tenant state
- New landing-page leads appear in the owner action queue for immediate follow-up
- Owner and dispatcher lead assignment preserves a named follow-up owner with idempotent, auditable changes
- Lead pipeline statuses can be advanced or marked lost with an auditable note before conversion
- Owners and dispatchers can queue deduplicated SMS/email follow-ups for open estimates
- Owners and dispatchers can bulk-queue deduplicated follow-ups for aging open estimates
- Landing-page retries can use an idempotency key to prevent duplicate leads
- Public landing-page and signed-portal mutations use configurable per-client/per-service rate limits with `Retry-After` responses and production readiness validation
- Proxy deployments can explicitly enable visitor-aware throttling with `NORTHSTAR_TRUST_PROXY=true`; direct socket addressing remains the safe default when proxy trust is not configured
- Owners can acknowledge active notifications while preserving the source record
- Customers can submit reschedule, cancellation, or question requests from the self-service portal, while owners and dispatchers can reply through the provider-pending message ledger
- Customer-initiated appointment cancellations create durable, deduplicated owner action notifications
- Customer-initiated appointment reschedules also surface as auditable owner action notifications
- Customer self-service requests accept idempotency keys so mobile retries do not create duplicate requests
- Accepted estimates can convert directly into scheduled, checklist-ready jobs, and canceled appointments can be rebooked into conflict-checked slots
- Server-side technician conflict detection for assignment and rescheduling
- Atomic bulk technician assignment with conflict preflight, confirmation notifications, and idempotent retries
- Atomic bulk job-status updates with lifecycle validation, technician safeguards, cancellation notes, notifications, and idempotent retries
- Owner workspace controls for recording technician time off that blocks conflicting dispatch assignments
- Time-off blocks can be canceled with preserved audit history when availability changes
- Multi-visit work orders with per-visit scheduling, technician assignment, and conflict checks
- Parent work orders expose derived visit progress so multi-visit execution stays visible without closing the job early
- Per-visit lifecycle transitions for multi-visit work orders
- Server-enforced job lifecycle transitions prevent invalid field states and bypassing completion requirements
- Service-plan renewal can schedule the next recurring visit using the same timezone-aware capacity slots as public booking, and normalized renewal dates can drive deduplicated SMS/email reminder campaigns
- Service plans support auditable pause, resume, cancellation, idempotent monthly/quarterly/annual visit-series scheduling, and individual or batch due membership-invoice generation by billing period
- Invoice payments support partial collection, remaining balances, payment methods, and references
- Invoice installment schedules support deposits and milestone payments while deriving paid progress from the payment ledger
- Signed customer invoice links create idempotent provider-pending payment intents without claiming settlement
- Customer invoice links show settled payment history with safe references and recorded dates
- Owners and accountants can open a normalized receipt summary from the invoice workspace
- Owners can generate secure invoice payment links directly from the invoice workspace
- Owners and accountants can queue deduplicated invoice balance reminders from the invoice workspace
- Customer portal invoices now expose secure payment actions scoped to the customer token
- Signed payment webhooks reconcile provider-confirmed intents into invoices and the payment ledger idempotently
- Payment ledger records are searchable and exportable for reconciliation
- Accounting reconciliation CSV combines persisted invoice balances with settled payments for owner/accountant handoff
- Dispatch assignment, status changes, and rescheduling are recorded in the customer timeline
- Owner rescheduling uses the same capacity-aware, date-specific availability slots exposed to landing pages and customer portals
- Dispatch priorities (`Low`, `Normal`, `High`, and `Emergency`) keep urgent jobs visible and auditable for owner/dispatcher teams
- Manual technician route ordering persists the real driving sequence and is shared by route manifests, CSV exports, and iCalendar feeds
- Team roster availability and active-job counts are derived from live tenant jobs
- Owners and dispatchers can add tenant-specific technicians or staff members to the roster
- Owners can create, suspend, reactivate, and reset passwords for tenant-scoped runtime login accounts for dispatchers, technicians, and accountants without editing deployment secrets; runtime passwords use salted scrypt hashes and reset invalidates prior sessions
- Customer assets support an optional validated warranty-through date, customer-portal visibility, and an auditable creation event
- Warranty dates within 30 days automatically surface as owner follow-up notifications
- Completed jobs can expose technician completion notes and bounded HTTPS photo evidence in the customer portal
- Dispatch can batch-invoice up to 50 completed jobs with all-or-nothing validation, direct job links, optional per-job amounts, validated per-job line items, and idempotent replay protection
- Completed customer jobs without an invoice surface an owner action and a direct invoice path from job detail
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

The image runs as the unprivileged `node` user in production mode, stores local state under `/app/data`, and exposes `/api/ready` as its container readiness check. Readiness requires a non-default session secret, configured owner/staff authentication, and all four webhook secrets (`NORTHSTAR_PAYMENT_WEBHOOK_SECRET`, `NORTHSTAR_MESSAGE_WEBHOOK_SECRET`, `NORTHSTAR_CALL_WEBHOOK_SECRET`, and `NORTHSTAR_FINANCING_WEBHOOK_SECRET`); configure these through deployment environment variables and do not bake credentials into the image. Demo login is disabled in production unless `NORTHSTAR_ALLOW_DEMO_LOGIN=true` is explicitly set for an isolated preview or smoke environment.

For an additional local recovery layer, set `NORTHSTAR_BACKUP_FILE` to a separate path on the same persistent volume. Northstar copies the previous valid snapshot there before each write and uses it if the primary snapshot cannot be parsed at startup. Managed multi-writer storage is still required for horizontally scaled production deployments.

### Publish a release image

Create a semantic-version tag such as `v0.2.0` and push it to GitHub. The `Publish Northstar container` workflow publishes both the versioned image and `latest` to `ghcr.io/psychopanda1/northstar-crm`, and attaches GitHub build provenance to the published digest; configure the required production environment variables in the service that runs the image, not in GitHub or the image itself. The workflow can also be started manually from Actions for an explicitly requested image publication.

Use `.env.example` as the handoff checklist for a deployment or a service landing-page integration. Copy it to `.env` for local work (`Copy-Item .env.example .env` in PowerShell), replace every placeholder, and keep the resulting file out of Git and container images. The tenant slug and service mapping must match the `service` key used by each landing page; the example intentionally contains no working credentials.

To generate a salted scrypt `NORTHSTAR_OWNER_PASSWORD_DIGEST` without putting the password in shell history, run `node scripts/generate-owner-digest.mjs`; store the printed digest only in the deployment secret configuration.

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

Fleet operations are available to authenticated owner and dispatcher sessions through `GET /api/vehicles`, `POST /api/vehicles`, `POST /api/vehicles/:id/status`, and `POST /api/jobs/:id/vehicle`; all vehicle records are tenant-scoped.

The current dashboard reads through `data-repository.js`. It can preview through the demo adapter, or use configured owner/staff credentials when `NORTHSTAR_OWNER_EMAIL`, `NORTHSTAR_OWNER_PASSWORD_DIGEST`, and `NORTHSTAR_OWNER_TENANT_ID`, `NORTHSTAR_OWNERS_JSON`, or `NORTHSTAR_STAFF_JSON` are set. Use `NORTHSTAR_OWNERS_JSON` for separate tenant-bound owner logins across multiple attached landing pages; use `NORTHSTAR_STAFF_JSON` for dispatcher, technician, or accountant accounts. If production disables demo login, the browser keeps the API login path available for those configured credentials instead of treating the API as unavailable, and the server dashboard reports only persisted tenant data rather than seeded demo baselines. Staff and owner entries are tenant-bound and carry only server-side password digests; credentials never reach landing pages. Production should replace this local credential seam with an identity provider while preserving the authenticated `/api/session` and `/api/dashboard` contract. Landing pages can use `/api/public/tenant`, `/api/public/availability`, and `/api/public/bookings` as the shared multi-service integration boundary. Authenticated owner workflows include inbound call outcomes through `POST /api/calls/:id/outcome`, with bounded notes, idempotent retries, and audit history, plus itemized draft estimates through `POST /api/estimates/:id/line-items`, immutable estimate revisions through `GET /api/estimates/:id/revisions`, estimate delivery through `POST /api/estimates/:id/send`, and server-side payment-intent dispatch through `POST /api/integrations/payments/dispatch` when `NORTHSTAR_PAYMENT_PROVIDER_URL` is configured. The owner workspace also provides tenant-scoped global search through `GET /api/search?q=...`.

Available local API routes include `GET /api/health`, `POST /api/auth/demo-login`, `POST /api/auth/logout`, `POST /api/public/leads`, `GET /api/public/job-status?token=...`, `GET /api/public/job-status/calendar?token=...`, `GET /api/public/estimate?token=...`, `POST /api/public/estimate/approve?token=...`, `GET /api/public/technician-job?token=...`, `POST /api/public/technician-job/estimate?token=...`, `POST /api/public/technician-job/status?token=...`, `GET|POST /api/public/technician-job/clock?token=...`, `POST /api/public/technician-job/complete?token=...`, `GET /api/public/customer-portal?token=...`, `GET /api/public/customer-portal/calendar?token=...&jobId=...`, `GET /api/public/review?token=...`, `POST /api/public/review?token=...`, `GET /api/session`, `GET /api/dashboard`, `GET /api/reports/overview`, `GET /api/export?type=customers`, `GET /api/team`, `GET /api/catalog`, `POST /api/catalog`, `PATCH /api/catalog/:id`, `GET /api/notifications`, `GET /api/audit`, `GET /api/customers`, `GET /api/customers/:id`, `GET /api/assets`, `GET /api/leads`, `GET /api/estimates`, `GET /api/invoices`, `GET /api/plans`, `GET /api/activities`, `GET /api/dispatch`, `GET /api/materials`, `GET /api/purchase-orders`, `GET /api/inventory-transactions`, `GET /api/job-costs`, `GET /api/messages`, `POST /api/customers`, `POST /api/assets`, `POST /api/leads`, `POST /api/leads/:id/convert`, `POST /api/jobs`, `POST /api/jobs/:id/assign`, `POST /api/jobs/:id/status`, `POST /api/jobs/:id/priority`, `POST /api/jobs/:id/reschedule`, `POST /api/jobs/:id/complete`, `POST /api/jobs/:id/technician-link`, `POST /api/jobs/:id/customer-link`, `POST /api/jobs/:id/review-link`, `POST /api/plans`, `POST /api/plans/:id/renew`, `POST /api/activities`, `POST /api/estimates`, `POST /api/estimates/:id/approve`, `POST /api/invoices`, `POST /api/invoices/:id/pay`, `POST /api/tasks/:index`, and `POST /api/actions`. The demo API uses an HMAC-signed, short-lived token with in-memory revocation and persists local development state in the ignored `.northstar-data.json`; production must use a real identity provider, validation, rate limiting, spam controls, and durable tenant-scoped storage.

Additional current routes include `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/integrations/health`, `POST /api/automations/run`, `GET /api/public/tenant`, `GET /api/public/availability?days=...` (up to a 14-day weekday booking window), `POST /api/public/bookings`, `POST /api/public/customer-portal/reschedule`, `POST /api/public/customer-portal/cancel`, `POST /api/public/customer-portal/financing-intent`, `POST /api/public/job-status/reschedule`, `POST /api/public/estimate/decline`, `POST /api/webhooks/calls/inbound`, `GET /api/calls`, `GET /api/dispatch?date=...`, `GET /api/dispatch?startDate=...&endDate=...`, `GET|POST /api/dispatch/capacity`, `POST /api/dispatch/route-order`, `GET /api/dispatch/route-manifest`, `GET /api/dispatch/route-summary`, `GET /api/dispatch/route-calendar`, `POST /api/dispatch/reminders`, `POST /api/dispatch/bulk-status`, `POST /api/dispatch/bulk-invoice`, `POST /api/estimates/reminders`, `POST /api/plans/reminders`, `POST /api/customers/reactivation`, `POST /api/customers/:id/tags`, `GET /api/reports/marketing`, `GET /api/reports/technicians`, `POST /api/messages/:id/retry`, `POST /api/payment-intents/:id/retry`, `GET /api/jobs/:id`, `GET /api/jobs/:id/calendar`, `POST /api/jobs/:id/rebook` (owner/dispatcher recovery for canceled appointments), `GET /api/invoices/:id/receipt`, `POST /api/team`, and `GET|POST /api/invoices/:id/schedule`. See [PORTAL_CONTRACT.md](PORTAL_CONTRACT.md) for request shapes, role boundaries, and customer-safe response rules.

## Next product slices

Recurring plans can be scheduled as idempotent 1–12 visit series through `POST /api/plans/:id/schedule`, billed individually through `POST /api/plans/:id/invoice`, or billed in one active-plan cycle through `POST /api/plans/billing-cycle`; see [PORTAL_CONTRACT.md](PORTAL_CONTRACT.md) for normalized request shapes and lifecycle rules.

Landing pages can discover the version 2 integration manifest, including owner authentication, customer portal reschedule, cancellation, request, payment-intent, and financing-intent endpoints, without hard-coding service-specific routes. Financing requests remain provider-pending until a real financing partner is connected; Northstar never claims a credit decision locally. Provider status callbacks use `POST /api/webhooks/financing` with `NORTHSTAR_FINANCING_WEBHOOK_SECRET` and remain separate from invoice settlement.

The public landing-page boundary is also described in [openapi.yaml](openapi.yaml), covering tenant discovery, customer-safe catalog, capacity-aware availability, idempotent lead capture, and idempotent booking. Replace the example server URL before sharing it with an integration team.

Completed customer-linked jobs can now move directly into invoicing from the dispatch workspace, including an idempotent `POST /api/jobs/:id/invoice` path with itemized subtotal, discount, and tax support for work that did not originate from an estimate. Owners and accountants can use `GET /api/reports/payroll` or `GET /api/export?type=payroll` for date-bounded timesheet and commission handoff.

The next implementation layer is production hardening: replace the local credential seam with a real identity provider, move JSON state and session revocation to durable managed storage, and connect real SMS/email/payment providers. The current local API already provides server-enforced role permissions, tenant isolation, restart-safe revocation, signed payment webhooks, customer/technician portals, timezone-aware capacity slots, scheduling conflict checks, and container deployment boundaries. `GET /api/public/tenant?service=...` also returns a versionable `integration` manifest so each service landing page can discover its booking, owner portal, lead, and availability endpoints without duplicating routing assumptions. The technician offline queue remains device-local for this prototype; production should use encrypted managed offline storage plus an explicit conflict policy.
