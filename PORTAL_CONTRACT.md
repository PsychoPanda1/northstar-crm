# Northstar portal contract

Northstar is the owner-facing portal attached to service-business landing pages. Landing pages may link owners to `/portal?service=plumbing` during the demo phase; the local server aliases `/portal` to the owner portal entry page. Production must resolve the tenant from the authenticated session on the server.

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

- `POST /api/public/leads` → accept a constrained landing-page inquiry using a service key; preserves submitted phone/email fields, records a system-attributed `lead.received` audit event, and supports an `Idempotency-Key` header to make retries safe; production must add validation, rate limiting, spam protection, and durable storage
- `GET /api/public/availability?service=...` and `POST /api/public/bookings?service=...` → expose date-specific slot IDs plus UTC appointment timestamps in the tenant IANA timezone and create an idempotent tenant-routed customer/job booking; successful bookings also create a system-attributed `booking.received` audit event; legacy relative labels remain supported while production capacity is connected
- Repeat bookings from the same tenant customer contact reuse the existing customer record while creating a new job, preserving service history across landing-page visits
- `GET /api/public/tenant?service=...` → return safe tenant branding and the canonical booking path for a service landing page; it never exposes owner or customer data
- `booking.html?service=...` → reusable browser form for the public availability/booking contract, returning a customer status link after booking
- `GET /api/public/job-status?token=...` → minimal customer-safe status response for the landing-page handoff, including optional stable slot and normalized appointment fields
- `POST /api/public/customer-portal/request?token=...` accepts an optional `Idempotency-Key`, returns `duplicate: true` for safe retries of the same customer request, and records an actor-attributed `customer.request.received` audit event
- Public status and customer-portal appointment records include optional `enRouteAt` without exposing owner or tenant identifiers
- Malformed JSON and request bodies above 64 KiB return controlled `400 bad_request` responses
- Public lead CORS is opt-in through `NORTHSTAR_ALLOWED_ORIGINS`; unlisted origins are rejected during preflight
- `GET /api/session` → `{ owner, tenant, permissions }`
- `POST /api/auth/login` accepts configured owner or tenant-bound staff credentials without returning or storing passwords; failed attempts are rate-limited and successful sessions use the same signed tenant-scoped token contract. Set `NORTHSTAR_OWNER_EMAIL`, `NORTHSTAR_OWNER_PASSWORD_DIGEST`, optional `NORTHSTAR_STAFF_JSON`, and a strong `NORTHSTAR_SESSION_SECRET`; production should replace this local credential seam with an identity provider.
- Demo login accepts `role=owner|dispatcher|technician|accountant`; production identity claims must map to the returned permission names and enforce them server-side
- `field:write` is limited to field execution endpoints such as labor/material capture; `jobs:write` remains required for dispatch administration and job creation
- Owner logout writes a session revocation record that survives API restarts in development; production should delegate session lifecycle and revocation to the identity provider
- `GET /api/customers` and `POST /api/customers` → list or create tenant-owned customer profiles; creation requires a phone, preserves an optional email, rejects duplicate phone/email contacts, and records a `customer.created` audit event
- `GET /api/customers/:id` → return one tenant-scoped customer profile with related jobs, assets, estimates, invoices, plans, and activities
- `POST /api/customers/:id/locations` → add a tenant-scoped service address to a customer profile
- `GET /api/dashboard?range=week` → `{ metrics, pipeline, tasks, schedule, activity }`
- `GET /api/reports/overview` → tenant-scoped funnel, scheduling, cash, recurring-revenue, and touchpoint metrics
- Report metrics also summarize estimate close rate, memberships sold, no-shows, open customer requests, tracked field hours, material spend, logged labor cost, and gross margin from recorded job data
- `GET /api/export?type=reports` → tenant-scoped CSV of the report metrics for owner and accounting handoff
- `GET /api/team` → tenant-scoped technician roster with derived availability and active-job counts used for assignment validation
- `POST /api/jobs` accepts optional ISO `startsAt`, `endsAt`, and IANA `timeZone` fields; valid timestamp ranges participate in overlap-aware appointment conflict checks
- `POST /api/jobs/:id/reschedule` accepts an available `slotId` or a legacy `time`; slot-based reschedules preserve normalized appointment metadata
- Authenticated technician labor/material writes are limited to the technician's assigned work order; technician roles cannot create inventory or purchase orders
- `POST /api/team` → owner/dispatcher-only creation of a tenant-scoped technician or staff roster member; duplicate names are rejected
- `GET /api/dispatch/recommendations?jobId=...` → rank available technicians by current workload and schedule conflicts; assignment still requires the normal server-side conflict check
- `GET /api/catalog` → tenant-scoped service catalog for consistent estimates and landing-page vocabulary
- `POST /api/catalog` → add a tenant-specific pricebook item; owner and dispatcher roles may write, while other roles remain read-only
- `GET /api/assets` and `POST /api/assets` → tenant-scoped customer equipment records for repeat service context; create accepts an optional ISO-parseable `warrantyThrough` date, and the customer portal exposes it without tenant identifiers
- `GET /api/notifications` → tenant-scoped action queue for new leads, unassigned jobs, unpaid invoices, approaching renewals, and equipment warranties expiring within 30 days
- `POST /api/notifications/:id/read` → acknowledge a currently active tenant notification without deleting its source record
- `GET /api/reviews` → tenant-scoped completed-job ratings and comments
- `GET /api/export?type=reviews` → tenant-scoped review history CSV for owner reporting
- `GET /api/materials` and `POST /api/materials` → tenant-scoped inventory records with stock and reorder thresholds
- `POST /api/jobs/:id/materials` → consume stocked material against a tenant-owned job and append an inventory transaction
- `GET /api/purchase-orders`, `POST /api/purchase-orders`, and `POST /api/purchase-orders/:id/receive` → create and receive replenishment orders with automatic stock reconciliation; creation records `purchase-order.created`, while receipt accepts an optional positive whole-number `quantity`, tracks `receivedQuantity`, supports split shipments, and records an owner-auditable receipt event
- `GET /api/job-costs` and `POST /api/jobs/:id/labor` → view tenant-scoped job profitability and log labor cost against a job
- `GET /api/payments` → tenant-scoped payment ledger for reconciliation and accounting handoff; signed provider webhooks also record `invoice.payment.succeeded` or `invoice.payment.failed` audit events
- `GET /api/export?type=customers|leads|estimates|invoices|payments|plans|activities|dispatch|assets` → tenant-scoped CSV export for owner reporting and accounting handoff
- `POST /api/jobs` → create a job after server-side tenant and role checks; validates that the customer exists, rejects an active appointment already using the requested time, and records a `job.created` audit event
- `POST /api/leads/:id/convert` → convert a tenant-owned lead into a customer and scheduled job while preserving lead attribution, timeline activity, and an actor-attributed audit event; rejects an active appointment already using the requested time
- `POST /api/leads/:id/status` → move an unconverted tenant lead through `New`, `Contacted`, `Qualified`, `Estimate sent`, `Won`, or `Lost`; converted leads are locked
- `POST /api/jobs/:id/assign` and `POST /api/jobs/:id/status` → update a tenant-owned job's technician and lifecycle state
- `POST /api/jobs/:id/no-show` → owner/dispatcher-only terminal transition from Confirmed or En route with a bounded reason, timestamp, activity, and audit event
- Job status changes follow a server-enforced lifecycle; terminal jobs cannot be reassigned, `Completed` requires the dedicated completion endpoint, and field states require an assigned technician
- `POST /api/jobs/:id/reschedule` → change the appointment time without recreating the job and queue a customer reschedule notification
- `POST /api/jobs/:id/checklist` → owner/dispatcher-only replacement of required checklist steps before a job starts; started or terminal jobs are locked
- Assignment and rescheduling reject active same-technician/time conflicts with `409 technician_schedule_conflict`
- `POST /api/jobs/:id/complete` → complete assigned work with a required note, timestamp, automatic customer timeline event, and actor-attributed `job.completed` audit event; repeated completion returns an idempotent duplicate response
- `POST /api/jobs/:id/technician-link` → issue a 24-hour, job-scoped technician mobile link for an assigned job
- `GET/POST /api/public/technician-job...` → technician-safe job detail and status/completion updates through the signed link
- `POST /api/public/technician-job/labor?token=...` → log field hours for the assigned job
- `GET/POST /api/public/technician-job/clock?token=...` → read or update the assigned technician's clock-in/out state; append-only completed sessions preserve aggregate elapsed field minutes and audit events
- Technician completion requires an inactive field clock; job-cost reporting exposes the resulting field minutes/hours separately from billable labor entries
- `POST /api/public/technician-job/materials?token=...` → consume available stock against the assigned job and append a source-tagged inventory transaction
- `GET /api/inventory-transactions` → authenticated tenant-scoped ledger of stock receipts, job consumption, and purchase receipts; exportable through `/api/export?type=inventory-transactions`
- Inbound message webhooks create owner-facing `Customer message needs response` notifications that use the existing tenant-scoped notification read route
- `POST /api/public/technician-job/payment-intent?token=...` → create an idempotent provider-pending Card/ACH intent only for the assigned job's open invoice; provider confirmation remains external
- New jobs include a required three-step field checklist; `POST /api/public/technician-job/checklist?token=...` updates checklist items and technician completion rejects incomplete work
- `POST /api/public/technician-job/photo?token=...` → attach up to 20 bounded HTTPS photo references with captions to the assigned job; production should replace URLs with signed object-storage uploads
- The technician page queues field `POST` actions locally during transient offline periods and replays them in order on reconnect; the prototype queue is device-local and production needs encrypted storage, retry limits, and conflict handling
- Dispatch assignment, status, and reschedule mutations append auditable customer timeline events
- `POST /api/jobs/:id/remind` → queue a deduplicated SMS/email appointment reminder for an open job
- Jobs may declare a required skill; recommendations and assignment reject technicians without that skill
- `GET|POST /api/jobs/:id/visits` → list or add scheduled visits for multi-day/multi-visit work orders
- `POST /api/jobs/:id/visits/:visitId/status` → advance a visit through Scheduled, En route, In progress, Completed, or Canceled states
- `POST /api/jobs/:id/customer-link` → issue a 72-hour customer portal link scoped to the job's customer
- `POST /api/jobs/:id/review-link` → issue a 72-hour review link for a completed job
- `GET /api/public/customer-portal?token=...` → customer-safe appointments, completion notes, bounded photo evidence, optional customer acknowledgment, equipment, estimates, invoices, and service plans including pricing breakdowns and a recorded next recurring visit when scheduled
- `POST /api/public/customer-portal/confirm?token=...` → confirm a customer-owned appointment idempotently, append a customer timeline event, and record an `appointment.confirmed` audit event
- `POST /api/public/customer-portal/request?token=...` → accept a customer reschedule, cancellation, or question request and route it into the owner action queue
- `POST /api/public/customer-portal/confirm?token=...` → confirm a customer-owned appointment idempotently and append a customer timeline event
- `POST /api/requests/:id/resolve` → resolve a tenant-owned customer request with an optional owner note, record an actor-attributed `customer.request.resolved` audit event, and return an idempotent duplicate response when already resolved
- `GET/POST /api/public/review?token=...` → read review state or submit one 1–5 rating and optional comment; duplicate submissions are rejected
- `GET /api/plans` and `POST /api/plans` → list or create recurring service plans
- `POST /api/plans/:id/renew` → renew a tenant-owned service plan and optionally schedule its next visit with `slotId` (preferred), legacy `time`, or normalized `startsAt`/`endsAt`; slot schedules preserve timezone metadata and reject active appointment conflicts
- `POST /api/plans/:id/pause`, `/cancel`, or `/resume` → manage a plan lifecycle with optional audit notes; canceled plans remain locked
- `GET /api/activities` and `POST /api/activities` → read or log tenant-owned customer calls, messages, and notes
- `GET /api/audit` and `GET /api/export?type=audit` → read or export a tenant-scoped event ledger for workflow traceability; prototype activity events use a system actor and production should attach verified identity/provider actors
- `GET /api/messages` and `POST /api/messages` → list or queue tenant-owned SMS/email messages; delivery remains provider-dependent until an external messaging service is connected
- `POST /api/messages/:id/reply` → owner/dispatcher-only reply to a tenant-scoped message, linked to the original thread and queued for provider delivery idempotently
- `POST /api/webhooks/messages` → accept an HMAC-signed, idempotent provider delivery event and reconcile queued messages to `Sent` or `Failed`; set `NORTHSTAR_MESSAGE_WEBHOOK_SECRET` in production
- `POST /api/webhooks/messages/inbound` → accept an HMAC-signed, idempotent inbound SMS/email reply, match it to a customer and optional job, and append it to the timeline
- `POST /api/jobs/:id/notify` → queue a tenant-owned confirmation, en-route, or completed message from job context; delivery remains provider-dependent and the message is linked to the job
- Assigning a job automatically queues a confirmation message; technician or dispatcher transitions to `En route` and `Completed` automatically queue the matching customer notification once per job/template/channel. Delivery remains provider-dependent until the signed message webhook reconciles it.

System events such as web-form lead capture, customer estimate approval, and recorded payment are appended to the same activity timeline automatically.
- `POST /api/auth/logout` → revoke the current session
- `POST /api/estimates` → create a draft estimate
- `POST /api/estimates` accepts an optional `catalogItemId` and snapshots the tenant pricebook item on the estimate so later catalog edits do not rewrite historical quotes
- `POST /api/estimates` also accepts up to three labeled `options`, or server-calculated `subtotal`, `discount`, and `taxRate` pricing components; public approval may include `optionId`, which snapshots the selected amount before quote-to-cash conversion
- `GET /api/public/estimate?token=...` returns the customer-safe subtotal, discount, tax, and total breakdown when pricing components were used
- `POST /api/public/estimate/approve?token=...` requires `approverName` and stores the typed approver in the estimate audit record
- `POST /api/estimates/:id/approve` → approve a tenant-owned estimate
- `POST /api/estimates/:id/remind` → queue an owner/dispatcher SMS or email follow-up for an open estimate, deduplicated for 24 hours
- `POST /api/estimates/:id/convert` → convert an accepted estimate into a scheduled, checklist-ready job; rejects an active appointment already using the requested time and records an actor-attributed `estimate.converted` audit event
- `POST /api/invoices` → create an invoice only from an approved estimate, reject duplicate invoices for the same estimate, and record an `invoice.created` audit event
- `POST /api/invoices/:id/pay` → record a full or partial tenant-owned invoice payment with method/reference; returns updated balance and payment ledger entry
- `POST /api/invoices/:id/remind` → queue an owner/accountant SMS or email balance reminder, deduplicated for 24 hours; provider delivery is reconciled through the message webhook
- `POST /api/invoices/:id/payment-link` → issue a 72-hour invoice payment link for the owner to share
- The invoice workspace exposes this payment-link action only for tenant-created invoices; seeded demo invoice cards remain read-only
- `GET|POST /api/invoices/:id/schedule` → read or create a tenant-scoped 2–12 installment schedule whose amounts must exactly match the invoice total; public payment links and customer portals expose derived paid amounts as payments settle
- `GET /api/public/invoice?token=...` and `POST /api/public/invoice/payment-intent?token=...` → expose safe invoice balance and create an idempotent Card/ACH payment intent; processor confirmation remains external
- `POST /api/public/customer-portal/payment-intent?token=...` → create the same provider-pending intent only when the invoice belongs to the customer represented by the portal token
- `POST /api/webhooks/payments` → accept an HMAC-signed, idempotent provider event and reconcile a succeeded intent into the invoice and payment ledger; set `NORTHSTAR_PAYMENT_WEBHOOK_SECRET` in production

## Data model starting point

Use `tenantId` on every business record: `customers`, `locations`, `leads`, `jobs`, `estimates`, `payments`, `tasks`, `teamMembers`, and `activityEvents`. Keep `ownerId` and role permissions separate from business records.

## Future-agent checklist

- Preserve the tenant and auth boundary when adding routes.
- Keep service-specific copy in configuration, not duplicated markup.
- Add an authorization test for every tenant-scoped read and write.
- Replace the demo login modal only after a real identity provider and session API exist.
