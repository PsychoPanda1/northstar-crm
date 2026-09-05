# Northstar portal contract

Northstar is the owner-facing portal attached to service-business landing pages. Landing pages may link owners to `/portal?service=plumbing` during the demo phase; the local server aliases `/portal` to the owner portal entry page. Production must resolve the tenant from the authenticated session on the server.

Deployments may extend the built-in service tenants with `NORTHSTAR_TENANTS_JSON` (an array of `{ slug, businessName, serviceLabel, timeZone }`) and map landing-page service keys with `NORTHSTAR_SERVICE_TENANTS_JSON` (an object of service key to tenant slug). Invalid entries are ignored; configured staff and owner accounts remain tenant-bound.

## Current demo seam

- `tenant-config.js` contains presentation-only configurations for plumbing, power washing, electrical, mobile car wash, and a home-services default.
- `app.js` applies the selected tenant name, service label, accent, and dashboard focus line.
- The owner sign-in dialog is intentionally a demo boundary. It does not collect, transmit, or validate credentials.
- API and static responses set CSP, clickjacking, MIME-sniffing, referrer, and permissions policies; `NODE_ENV=production` also enables HSTS
- `server.mjs` provides a dependency-free local API with signed demo sessions, tenant-scoped record routes, and restart-safe development persistence.

## Production boundary

1. Landing page: lead capture and owner-login link, with no direct access to another tenant's data.
2. Identity service: authenticate the owner and return a short-lived session with `ownerId` and `tenantId`.
3. Portal API: authorize every query and mutation against the session's `tenantId`; never use a query-string tenant as an authorization decision.
4. Northstar UI: consume a tenant-scoped API and render the appropriate service vocabulary, workflows, and metrics.

## Recommended API shape

- `POST /api/public/leads` → accept a constrained landing-page inquiry using a service key; validates email/phone shape, preserves submitted contact fields, records a system-attributed `lead.received` audit event, and supports an `Idempotency-Key` header to make retries safe; production must add stronger abuse controls and durable storage
- `GET /api/public/availability?service=...&days=...` and `POST /api/public/bookings?service=...` → expose up to 14 days of weekday capacity (with legacy relative labels still supported), date-specific slot IDs, and UTC appointment timestamps in the tenant IANA timezone; booking creates an idempotent tenant-routed customer/job booking and a system-attributed `booking.received` audit event
- Repeat bookings from the same tenant customer contact reuse the existing customer record while creating a new job, preserving service history across landing-page visits
- `GET /api/public/tenant?service=...` → return safe tenant branding and the canonical booking path for a service landing page; it never exposes owner or customer data
- The owner portal presentation resolver hydrates its safe branding from `/api/public/tenant`, so environment-configured service tenants render their own business name and service label without exposing tenant data to public customer pages
- `booking.html?service=...` → reusable browser form for the public availability/booking contract, returning a customer status link after booking
- `GET /api/public/job-status?token=...` → minimal customer-safe status response for the landing-page handoff, including optional stable slot, normalized appointment fields, and available reschedule slots
- `POST /api/public/job-status/reschedule?token=...` → apply a new available slot using the status token returned by a landing-page booking; it is conflict-checked, idempotent, and records customer timeline/audit and notification events
- `POST /api/public/customer-portal/request?token=...` accepts an optional `Idempotency-Key`, returns `duplicate: true` for safe retries of the same customer request, and records an actor-attributed `customer.request.received` audit event
- `POST /api/public/customer-portal/location?token=...` → customer-token-only update of the primary service address or addition of a secondary address, with bounded validation, idempotent replay, tenant-scoped persistence, and customer-attributed audit history
- Public status and customer-portal appointment records include optional `enRouteAt` without exposing owner or tenant identifiers
- Malformed JSON and request bodies above 64 KiB return controlled `400 bad_request` responses
- Public lead CORS is opt-in through `NORTHSTAR_ALLOWED_ORIGINS`; unlisted origins are rejected during preflight
- `GET /api/session` → `{ owner, tenant, permissions }`
- `POST /api/auth/refresh` → rotate a still-valid owner/staff bearer session, revoke the prior token and session ID, and return a replacement with `expiresAt`; expired or logged-out sessions cannot be refreshed
- `POST /api/auth/login` accepts configured owner or tenant-bound staff credentials without returning or storing passwords; failed attempts are rate-limited and successful sessions use the same signed tenant-scoped token contract. Set `NORTHSTAR_OWNER_EMAIL`, `NORTHSTAR_OWNER_PASSWORD_DIGEST`, `NORTHSTAR_OWNER_TENANT_ID`, optional `NORTHSTAR_STAFF_JSON`, and a strong `NORTHSTAR_SESSION_SECRET`; configured owner credentials cannot select a different tenant through the service parameter, and production should replace this local credential seam with an identity provider.
- `POST /api/auth/demo-login` is disabled automatically when `NODE_ENV=production`; set `NORTHSTAR_ALLOW_DEMO_LOGIN=true` only for an explicitly isolated preview or smoke environment.
- `GET /api/ready` returns `200` only when production signing, owner/staff authentication, webhook secrets, and a writable persistent-state file or parent directory are present; it is the container readiness contract, while `GET /api/health` remains a liveness check.
- `GET /api/integrations/health` → authenticated, tenant-scoped communication/payment queue health with webhook-secret checks and stale/failed/pending counts; it reports operational attention separately from process liveness and deployment readiness
- Demo login accepts `role=owner|dispatcher|technician|accountant`; production identity claims must map to the returned permission names and enforce them server-side
- `field:write` is limited to field execution endpoints such as labor/material capture; `jobs:write` remains required for dispatch administration and job creation
- Owner logout writes a session revocation record that survives API restarts in development; production should delegate session lifecycle and revocation to the identity provider
- `GET /api/customers` and `POST /api/customers` → list or create tenant-owned customer profiles; creation requires a phone, validates an optional email captured by the owner workspace, rejects duplicate phone/email contacts, accepts an optional `Idempotency-Key` for safe retries, and records a `customer.created` audit event
- `POST /api/customers/reactivation` → owner/dispatcher-only campaign endpoint that queues deduplicated SMS/email reactivation messages for customers without a recent completed service; accepts `inactiveDays` from 30–730 plus an optional normalized internal `tag` filter and returns sanitized queue summaries
- `GET /api/customers/:id` → return one tenant-scoped customer profile with related jobs, assets, estimates, invoices, plans, and activities
- `GET /api/customers/:id/timeline?limit=...` → return a bounded, tenant-scoped customer timeline projection of activities, messages, job lifecycle, labor, and material-consumption records without requiring consumers to load the full profile payload
- Records returned by the owner API enrich legacy name-based customer records with a matching tenant-scoped `customerId` when one can be resolved, preserving compatibility while enabling durable history links
- Owner-facing business records, including derived team and catalog records plus system timeline/audit events, carry an explicit `tenantId` for exports and future managed-storage migration
- Customer profile and timeline joins use an existing `customerId` as authoritative; name matching is only a compatibility fallback for records that have no durable customer link
- The owner portal customer picker passes durable IDs for new notes, assets, and estimates; exact-name ambiguity is rejected in the browser instead of silently selecting the first account
- `PATCH|PUT /api/customers/:id` → update an owner/dispatcher-managed customer's name, phone, email, or primary location with email-shape and duplicate-contact protection plus an actor-attributed `customer.updated` audit event; accepts an optional `Idempotency-Key` and returns `duplicate: true` for a safe retry
- `POST /api/customers/:id/locations` → add a tenant-scoped service address to a customer profile; accepts an optional `Idempotency-Key`, returns `duplicate: true` for safe retries, and appends an actor-attributed `location.created` audit event
- `POST /api/customers/:id/tags` → owner/dispatcher-only replace the customer’s bounded, normalized internal tag set; accepts an `Idempotency-Key`, records an audit event, and never exposes tags through customer tokens
- `POST /api/customers/:id/preferences` → owner/dispatcher-only update of tenant-scoped SMS/email opt-out flags; direct messages, appointment notifications, and reactivation campaigns reject or skip opted-out channels, while customer tokens never expose preference metadata
- `GET /api/dashboard?range=week` → `{ metrics, pipeline, tasks, schedule, activity }`
- `GET /api/reports/overview` → tenant-scoped funnel, scheduling, cash, recurring-revenue, and touchpoint metrics
- `GET /api/reports/marketing` → owner/dispatcher/accountant-only source attribution report with lead counts, converted counts, conversion rates, scheduled jobs, attributed lead value, booked revenue, and collected revenue by landing-page source
- `GET /api/reports/technicians` → owner/dispatcher/accountant-only technician performance report with jobs, completion/no-show counts, field hours, revenue, material/labor cost, gross margin, and completion rate
- Report metrics also summarize estimate close rate, memberships sold, no-shows, open customer requests, tracked field hours, material spend, logged labor cost, and gross margin from recorded job data
- `GET /api/export?type=reports` → tenant-scoped CSV of the report metrics for owner and accounting handoff
- `GET /api/team` → tenant-scoped technician roster with derived availability and active-job counts used for assignment validation
- `POST /api/jobs` accepts optional ISO `startsAt`, `endsAt`, and IANA `timeZone` fields; valid timestamp ranges participate in overlap-aware appointment conflict checks
- `POST /api/jobs/:id/reschedule` accepts an available `slotId` or a legacy `time`; slot-based reschedules preserve normalized appointment metadata
- Authenticated technician labor/material writes are limited to the technician's assigned work order; technician roles cannot create inventory or purchase orders
- `POST /api/team` → owner/dispatcher-only creation of a tenant-scoped technician or staff roster member; duplicate names are rejected and an optional `Idempotency-Key` makes browser retries safe
- `GET /api/dispatch/recommendations?jobId=...` → rank available technicians by current workload and schedule conflicts; assignment still requires the normal server-side conflict check
- Dispatch recommendations also include bounded completion/no-show history and use completion performance as a tie-breaker, while skill and schedule conflicts remain hard eligibility rules.
- `GET /api/dispatch/route-manifest?date=YYYY-MM-DD&technician=...` → return a tenant-scoped, normalized-time route ordered by start time with customer, service, address, status, priority, and timezone; technicians are restricted to their own route, while owners and dispatchers may filter by technician
- `GET /api/dispatch/route-calendar?date=YYYY-MM-DD&technician=...` → download the same normalized route as an iCalendar feed for calendar applications; it is tenant-scoped, technician-restricted, excludes canceled/no-show work, and respects saved manual route order.
- `POST /api/dispatch/route-order` → owner/dispatcher-only manual ordering of a technician's complete same-day normalized route; job IDs must be unique and match every active stop for the requested tenant-local date and technician, and retries support idempotency.
- Route order metadata is cleared automatically when a job is reassigned or rescheduled, preventing an old route sequence from leaking into a new technician/date.
- `GET /api/dispatch/route-summary?date=YYYY-MM-DD&technician=...` → return tenant-scoped stop counts, assigned/unassigned workload, emergency-stop count, planned field minutes, and per-technician workload for dispatch planning; technicians are restricted to their own summary
- `GET /api/dispatch/capacity?date=YYYY-MM-DD&technician=...` and `POST /api/dispatch/capacity` → owner/dispatcher-managed daily technician capacity targets with planned minutes, remaining minutes, and utilization percentage; technician reads are restricted to their own lane
- `GET /api/dispatch?date=YYYY-MM-DD` → return only scheduled jobs whose normalized appointment falls on the requested tenant-local work date; invalid dates are rejected and undated demo records are excluded.
- `GET /api/dispatch?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` → return a tenant-local planning window of up to 31 calendar days, ordered by normalized appointment start; larger or malformed ranges are rejected.
- `GET /api/catalog` → tenant-scoped service catalog for consistent estimates and landing-page vocabulary
- `POST /api/catalog` → add a tenant-specific pricebook item; owner and dispatcher roles may write, while other roles remain read-only; an optional `Idempotency-Key` makes retries safe
- `GET /api/assets` and `POST /api/assets` → tenant-scoped customer equipment records for repeat service context; create accepts a durable `customerId` (with legacy customer-name fallback), stores `customerId`, accepts an optional ISO-parseable `warrantyThrough` date, supports an optional `Idempotency-Key` for retry-safe writes, and the customer portal exposes it without tenant identifiers
- `GET /api/notifications` → tenant-scoped action queue for new leads, unassigned jobs, unpaid invoices, approaching renewals, and equipment warranties expiring within 30 days
- `POST /api/notifications/:id/read` → acknowledge a currently active tenant notification without deleting its source record
- `GET /api/reviews` → tenant-scoped completed-job ratings and comments
- `GET /api/export?type=reviews` → tenant-scoped review history CSV for owner reporting
- `GET /api/materials` and `POST /api/materials` → tenant-scoped inventory records with stock and reorder thresholds; creation accepts an optional `Idempotency-Key` for safe retries
- `POST /api/jobs/:id/materials` and `POST /api/public/technician-job/materials?token=...` → consume stocked material against a tenant-owned job; `Idempotency-Key` makes field retries return the original transaction, while successful writes append an `inventory.consumed` audit event
- `GET /api/purchase-orders`, `POST /api/purchase-orders`, and `POST /api/purchase-orders/:id/receive` → create and receive replenishment orders with automatic stock reconciliation; creation records `purchase-order.created` and accepts an optional `Idempotency-Key`, while receipt accepts an optional positive whole-number `quantity`, tracks `receivedQuantity`, supports split shipments, accepts an optional `Idempotency-Key` for safe warehouse retries, and records an owner-auditable receipt event
- `GET /api/job-costs`, `POST /api/jobs/:id/labor`, and `POST /api/public/technician-job/labor?token=...` → view tenant-scoped job profitability and log labor cost against a job; customer-linked labor entries expose `customerId` for history and exports; `Idempotency-Key` makes field retries return the original entry, and labor writes record `labor.logged` audit events
- Inventory consumption projections expose the owning job's `customerId`, keeping parts usage addressable from customer history and exports.
- `GET /api/payments` → tenant-scoped payment ledger for reconciliation and accounting handoff; signed provider webhooks record `invoice.payment.succeeded` or `invoice.payment.failed` audit events only after passing invoice-balance validation
- `GET /api/export?type=customers|leads|estimates|invoices|payments|plans|activities|dispatch|assets|calls` → tenant-scoped CSV export for owner reporting, call QA, and accounting handoff
- `GET /api/export?type=accounting` → tenant-scoped reconciliation CSV combining persisted invoice balances and settled payment rows with stable invoice, payment, customer, method, reference, and recorded-at fields; seeded presentation records are excluded
- `POST /api/jobs` → create a job after server-side tenant and role checks; validates that the customer exists, rejects an active appointment already using the requested time, accepts an optional `Idempotency-Key` for safe scheduling retries, and records a `job.created` audit event
- `POST /api/leads/:id/convert` → convert a tenant-owned lead into a customer and scheduled job while preserving lead attribution, filling missing customer contact fields from the lead, timeline activity, and an actor-attributed audit event; accepts a preferred available `slotId` (or legacy `time`), preserves normalized appointment timestamps for slot-based conversions, rejects active appointment conflicts, and accepts an optional `Idempotency-Key` for safe retries
- `POST /api/leads/:id/status` → move an unconverted tenant lead through `New`, `Contacted`, `Qualified`, `Estimate sent`, `Won`, or `Lost`; converted leads are locked
- `POST /api/jobs/:id/assign` and `POST /api/jobs/:id/status` → update a tenant-owned job's technician and lifecycle state; same-technician assignment retries return `duplicate: true`, and new assignments record an actor-attributed `job.assigned` audit event
- `POST /api/jobs/:id/no-show` → owner/dispatcher-only terminal transition from Confirmed or En route with a bounded reason, timestamp, activity, and audit event; accepts an optional `Idempotency-Key` and returns `duplicate: true` for a safe retry
- Job status changes follow a server-enforced lifecycle; terminal jobs cannot be reassigned, `Completed` requires the dedicated completion endpoint, field states require an assigned technician, and lifecycle updates record `job.status.updated`
- `POST /api/jobs/:id/reschedule` → change the appointment time without recreating the job, preferably with an available `slotId` from the 14-day availability window; queue a customer reschedule notification and record an actor-attributed `job.rescheduled` audit event; accepts an optional `Idempotency-Key` and returns `duplicate: true` for a safe retry of the same request
- `POST /api/jobs/:id/priority` → owner/dispatcher-only update of a non-terminal job's bounded `Low`, `Normal`, `High`, or `Emergency` priority with an actor-attributed audit event
- `POST /api/jobs/:id/checklist` → owner/dispatcher-only replacement of required checklist steps before a job starts; started or terminal jobs are locked
- Assignment and rescheduling reject active same-technician/time conflicts with `409 technician_schedule_conflict`
- `POST /api/jobs/:id/complete` → complete assigned work with a required note, timestamp, automatic customer timeline event, and actor-attributed `job.completed` audit event; repeated completion returns an idempotent duplicate response
- `POST /api/jobs/:id/technician-link` → issue a 24-hour, job-scoped technician mobile link for an assigned job
- `GET/POST /api/public/technician-job...` → technician-safe job detail including the service address, plus status/completion updates through the signed link; customer phone/email and unrelated tenant records remain excluded, same-state job and visit-status retries return idempotent duplicates, status writes record `job.status.updated`, completion records `job.completed`, and repeated closeout requests return an idempotent duplicate response
- `POST /api/public/technician-job/labor?token=...` → log field hours for the assigned job
- `GET/POST /api/public/technician-job/clock?token=...` → read or update the assigned technician's clock-in/out state; `Idempotency-Key` makes mobile retries replay the original transition, while append-only completed sessions preserve aggregate elapsed field minutes and audit events
- Technician completion requires an inactive field clock; job-cost reporting exposes the resulting field minutes/hours separately from billable labor entries
- `POST /api/public/technician-job/materials?token=...` → consume available stock against the assigned job and append a source-tagged inventory transaction
- `GET /api/inventory-transactions` → authenticated tenant-scoped ledger of stock receipts, job consumption, and purchase receipts; exportable through `/api/export?type=inventory-transactions`
- Inbound message webhooks create owner-facing `Customer message needs response` notifications that use the existing tenant-scoped notification read route
- `POST /api/public/technician-job/payment-intent?token=...` → create an idempotent provider-pending Card/ACH intent only for the assigned job's open invoice; provider confirmation remains external
- New jobs include a required three-step field checklist; `POST /api/public/technician-job/checklist?token=...` updates checklist items and technician completion rejects incomplete work
- `POST /api/public/technician-job/photo?token=...` → attach up to 20 bounded HTTPS photo references with captions to the assigned job; accepts an optional `Idempotency-Key` for offline replay safety, and production should replace URLs with signed object-storage uploads
- The technician page queues field `POST` actions locally during transient offline periods and replays them in order on reconnect; the prototype queue is device-local and production needs encrypted storage, retry limits, and conflict handling
- Dispatch assignment, status, and reschedule mutations append auditable customer timeline events
- `POST /api/jobs/:id/remind` → queue a deduplicated SMS/email appointment reminder for an open job
- `GET /api/jobs/:id/calendar` → owner/dispatcher/accountant-only iCalendar download for a job with normalized UTC appointment bounds; exports only the selected appointment and service address, with no broader CRM data
- `POST /api/dispatch/reminders` → owner/dispatcher-only bulk queue of deduplicated SMS/email reminders for normalized appointments within a 1–168 hour horizon; skips terminal jobs and returns eligible, queued, and duplicate counts for safe operator reruns
- Jobs may declare a required skill; recommendations and assignment reject technicians without that skill
- `GET|POST /api/jobs/:id/visits` → list or add scheduled visits for multi-day/multi-visit work orders; creation accepts an optional `Idempotency-Key` and returns `duplicate: true` for a safe retry
- `POST /api/jobs/:id/visits/:visitId/status` → advance a visit through Scheduled, En route, In progress, Completed, or Canceled states; same-state retries return `duplicate: true` without another timeline or audit event
- `POST /api/jobs/:id/customer-link` → issue a 72-hour customer portal link scoped to the job's customer
- `POST /api/jobs/:id/review-link` → issue a 72-hour review link for a completed job
- `GET /api/public/customer-portal?token=...` → customer-safe appointments, completion notes, bounded photo evidence, optional customer acknowledgment, equipment, estimates, invoices with settled payment history and expiring secure payment links for open balances, service plans, sanitized message history, and sanitized request statuses including pricing breakdowns, a recorded next recurring visit when scheduled, and up to 12 currently available reschedule slots per appointment
- `GET|POST /api/public/customer-portal/preferences?token=...` → customer-token-only read/update of SMS/email opt-out flags with idempotent replay and customer-attributed audit history; preference fields are not included in the general portal GET projection
- `POST /api/public/customer-portal/confirm?token=...` → confirm a customer-owned appointment idempotently, append a customer timeline event, and record an `appointment.confirmed` audit event
- `POST /api/public/customer-portal/reschedule?token=...` → move a customer-owned, active appointment to one of its returned `availableRescheduleSlots`; the mutation is customer-token-only, idempotent, conflict-checked, and queues a rescheduled notification with an `appointment.rescheduled` audit event
- `POST /api/public/customer-portal/request?token=...` → accept a customer reschedule, cancellation, or question request and route it into the owner action queue
- `POST /api/public/customer-portal/confirm?token=...` → confirm a customer-owned appointment idempotently and append a customer timeline event
- `POST /api/requests/:id/resolve` → resolve a tenant-owned customer request with an optional owner note, record an actor-attributed `customer.request.resolved` audit event, and return an idempotent duplicate response when already resolved
- `GET/POST /api/public/review?token=...` → read review state or submit one 1–5 rating and optional comment; duplicate submissions are rejected
- `GET /api/plans` and `POST /api/plans` → list or create recurring service plans for an existing tenant customer; creation accepts durable `customerId` with legacy name fallback, stores `customerId`, preserves the canonical customer name, accepts an optional `Idempotency-Key` for safe retries, and records a `plan.created` audit event
- `POST /api/plans/:id/renew` → renew a tenant-owned service plan and optionally schedule its next visit with `slotId` (preferred), legacy `time`, or normalized `startsAt`/`endsAt`; linked plans resolve the next job by durable `customerId`, legacy plans fall back to canonical name matching, slot schedules preserve timezone metadata, reject active appointment conflicts, record `plan.renewed`, and accept an optional `Idempotency-Key` for safe retries
- `POST /api/plans/:id/pause`, `/cancel`, or `/resume` → manage a plan lifecycle with optional audit notes; canceled plans remain locked
- `GET /api/activities` and `POST /api/activities` → read or log tenant-owned customer calls, messages, and notes; activity records preserve `customerId` when the customer exists, owner-created activities accept durable `customerId` with legacy name fallback, must reference an existing tenant customer, accept an optional `Idempotency-Key`, return `duplicate: true` for a safe retry, and append an actor-attributed `activity.created` audit event
- `GET /api/audit` and `GET /api/export?type=audit` → read or export a tenant-scoped event ledger for workflow traceability; prototype activity events use a system actor and production should attach verified identity/provider actors
- `GET /api/messages` and `POST /api/messages` → list or queue tenant-owned SMS/email messages; outbound writes accept durable `customerId` with legacy name fallback, require an existing tenant customer, `Idempotency-Key` makes retries return the original queued message, and successful writes append an actor-attributed `message.created` audit event
- `POST /api/messages/:id/reply` → owner/dispatcher-only reply to a tenant-scoped message, linked to the original thread and queued for provider delivery idempotently
- `POST /api/messages/:id/retry` → owner/dispatcher-only retry of a failed tenant-scoped outbound message, preserving customer/job/invoice context and linking the new queued message through `retryOf`; accepts an `Idempotency-Key`
- `POST /api/webhooks/messages` → accept an HMAC-signed, idempotent provider delivery event and reconcile queued messages to `Sent` or `Failed`; set `NORTHSTAR_MESSAGE_WEBHOOK_SECRET` in production
- `POST /api/webhooks/messages/inbound` → accept an HMAC-signed, idempotent inbound SMS/email reply, match it to a customer and optional job, and append it to the timeline; exact SMS `STOP`, `UNSUBSCRIBE`, `CANCEL`, `END`, and `QUIT` replies also set the matched customer's SMS opt-out flag and append an auditable preference event
- `POST /api/webhooks/calls/inbound` → accept an HMAC-signed, idempotent inbound call event, match it to a customer and optional job, create a lead for an unknown caller, record missed/completed status, and append a bounded call activity without exposing recording URLs; set `NORTHSTAR_CALL_WEBHOOK_SECRET` in production
- `GET /api/calls` → authenticated owner/dispatcher/accountant call ledger; technicians only see calls linked to their assigned jobs
- `POST /api/calls/:id/outcome` → owner/dispatcher-only bounded outcome update (`New lead`, `Booked`, `No answer`, `Resolved`, or `Wrong number`) with optional note, idempotency, activity, and audit trail
- `POST /api/jobs/:id/notify` → queue a tenant-owned confirmation, en-route, or completed message from job context; repeated requests for the same job/template/channel return the original queued message, while delivery remains provider-dependent
- Assigning a job automatically queues a confirmation message; technician or dispatcher transitions to `En route` and `Completed` automatically queue the matching customer notification once per job/template/channel, preserving `customerId` when available. Delivery remains provider-dependent until the signed message webhook reconciles it.

System events such as web-form lead capture, customer estimate approval, and recorded payment are appended to the same activity timeline automatically.
- `POST /api/auth/logout` → revoke the current session
- `POST /api/estimates` → create a draft estimate for an existing tenant customer by canonical name or `customerId`; the estimate stores the durable customer link and accepts an optional `Idempotency-Key` for safe browser retries
- `POST /api/estimates` accepts an optional `catalogItemId` and snapshots the tenant pricebook item on the estimate so later catalog edits do not rewrite historical quotes
- `POST /api/estimates` also accepts up to three labeled `options`, or server-calculated `subtotal`, `discount`, and `taxRate` pricing components; public approval may include `optionId`, which snapshots the selected amount before quote-to-cash conversion
- `GET /api/public/estimate?token=...` returns the customer-safe subtotal, discount, tax, and total breakdown when pricing components were used
- `POST /api/public/estimate/approve?token=...` requires `approverName` and stores the typed approver in the estimate audit record
- `POST /api/public/estimate/decline?token=...` records a customer-provided decline reason, updates the estimate lifecycle to `Declined`, and is safely idempotent on repeat submission
- `POST /api/estimates/:id/approve` → approve a tenant-owned estimate
- `POST /api/estimates/:id/remind` → queue an owner/dispatcher SMS or email follow-up for an open estimate, preserving its durable `customerId` and deduplicating for 24 hours
- `POST /api/estimates/:id/convert` → convert an accepted estimate into a scheduled, checklist-ready job; accepts a preferred available `slotId` (or legacy `time`), preserves normalized appointment timestamps for slot-based conversions, rejects active appointment conflicts, accepts an optional `Idempotency-Key` for safe retries, and records an actor-attributed `estimate.converted` audit event
- `POST /api/invoices` → create an invoice only from an approved estimate, carry forward its durable `customerId`, reject duplicate invoices for the same estimate, accept an optional `Idempotency-Key` for safe retries, and record an `invoice.created` audit event
- `POST /api/invoices/:id/pay` → record a full or partial tenant-owned invoice payment with method/reference and the invoice's durable `customerId`; an `Idempotency-Key` makes retries return the original payment without double-counting, and successful writes append `invoice.payment.recorded` to the audit ledger
- `POST /api/invoices/:id/remind` → queue an owner/accountant SMS or email balance reminder with the invoice's durable `customerId`, deduplicated for 24 hours; provider delivery is reconciled through the message webhook
- `POST /api/receivables/reminders` → owner/accountant-only bulk queue of deduplicated balance reminders above a caller-selected minimum balance, returning eligible, queued, and duplicate counts for safe aging-queue reruns
- `POST /api/estimates/reminders` → owner/dispatcher-only bulk queue of deduplicated SMS/email follow-ups for open estimates at or beyond a caller-selected age from 1–365 days
- `POST /api/invoices/:id/payment-link` → issue a 72-hour invoice payment link for the owner to share
- `GET /api/invoices/:id/receipt` → owner/accountant-only normalized receipt summary with invoice totals, settled payments, references, and remaining balance
- The invoice workspace exposes this payment-link action only for tenant-created invoices; seeded demo invoice cards remain read-only
- `GET|POST /api/invoices/:id/schedule` → read or create a tenant-scoped 2–12 installment schedule whose amounts must exactly match the invoice total; creation accepts an optional `Idempotency-Key` for safe retries, and public payment links and customer portals expose derived paid amounts as payments settle
- `GET /api/public/invoice?token=...` and `POST /api/public/invoice/payment-intent?token=...` → expose safe invoice balance plus settled payment history and create an idempotent Card/ACH payment intent carrying the invoice's durable `customerId`; processor confirmation remains external
- `POST /api/public/customer-portal/payment-intent?token=...` → create the same provider-pending intent with the portal customer's `customerId`, only when the invoice belongs to that customer
- `POST /api/webhooks/payments` → accept an HMAC-signed, idempotent provider event and reconcile a succeeded intent into the invoice and payment ledger while preserving its durable `customerId`; set `NORTHSTAR_PAYMENT_WEBHOOK_SECRET` in production
- `POST /api/payment-intents/:id/retry` → owner/accountant-only retry of a failed provider intent while enforcing the current invoice balance, preserving invoice/customer/job context, linking the new intent through `retryOf`, and accepting an `Idempotency-Key`

## Data model starting point

Use `tenantId` on every business record: `customers`, `locations`, `leads`, `jobs`, `estimates`, `payments`, `tasks`, `teamMembers`, and `activityEvents`. Keep `ownerId` and role permissions separate from business records.

## Future-agent checklist

- `GET /api/jobs/:id` returns a tenant-scoped work-order detail bundle for authenticated staff: job data, customer summary, estimate/invoice summaries, visits, field materials, labor, provider-pending messages, cost totals, and job audit events. Owners and dispatchers may read any tenant job; technicians may read only jobs assigned to their authenticated name.

- Preserve the tenant and auth boundary when adding routes.
- Keep service-specific copy in configuration, not duplicated markup.
- Add an authorization test for every tenant-scoped read and write.
- Replace the demo login modal only after a real identity provider and session API exist.
