# Northstar portal contract

Northstar is the owner-facing portal attached to service-business landing pages. Landing pages may link owners to `/portal?service=plumbing` during the demo phase; the local server aliases `/portal` to the owner portal entry page. Production must resolve the tenant from the authenticated session on the server.

## Current demo seam

- `tenant-config.js` contains presentation-only configurations for plumbing, power washing, electrical, mobile car wash, and a home-services default.
- `app.js` applies the selected tenant name, service label, accent, and dashboard focus line.
- The owner sign-in dialog is intentionally a demo boundary. It does not collect, transmit, or validate credentials.
- `server.mjs` provides a dependency-free local API with signed demo sessions, tenant-scoped record routes, and restart-safe development persistence.

## Production boundary

1. Landing page: lead capture and owner-login link, with no direct access to another tenant's data.
2. Identity service: authenticate the owner and return a short-lived session with `ownerId` and `tenantId`.
3. Portal API: authorize every query and mutation against the session's `tenantId`; never use a query-string tenant as an authorization decision.
4. Northstar UI: consume a tenant-scoped API and render the appropriate service vocabulary, workflows, and metrics.

## Recommended API shape

- `POST /api/public/leads` → accept a constrained landing-page inquiry using a service key; supports an `Idempotency-Key` header to make retries safe; production must add validation, rate limiting, spam protection, and durable storage
- `GET /api/public/availability?service=...` and `POST /api/public/bookings?service=...` → expose landing-page slots and create an idempotent tenant-routed customer/job booking; production should replace prototype slots with live timezone-aware capacity
- Malformed JSON and request bodies above 64 KiB return controlled `400 bad_request` responses
- Public lead CORS is opt-in through `NORTHSTAR_ALLOWED_ORIGINS`; unlisted origins are rejected during preflight
- `GET /api/session` → `{ owner, tenant, permissions }`
- Demo login accepts `role=owner|dispatcher|technician|accountant`; production identity claims must map to the returned permission names and enforce them server-side
- `field:write` is limited to field execution endpoints such as labor/material capture; `jobs:write` remains required for dispatch administration and job creation
- Owner logout writes a session revocation record that survives API restarts in development; production should delegate session lifecycle and revocation to the identity provider
- `GET /api/customers` and `POST /api/customers` → list or create tenant-owned customer profiles
- `GET /api/customers/:id` → return one tenant-scoped customer profile with related jobs, assets, estimates, invoices, plans, and activities
- `POST /api/customers/:id/locations` → add a tenant-scoped service address to a customer profile
- `GET /api/dashboard?range=week` → `{ metrics, pipeline, tasks, schedule, activity }`
- `GET /api/reports/overview` → tenant-scoped funnel, scheduling, cash, recurring-revenue, and touchpoint metrics
- `GET /api/team` → tenant-scoped technician roster with derived availability and active-job counts used for assignment validation
- `GET /api/dispatch/recommendations?jobId=...` → rank available technicians by current workload and schedule conflicts; assignment still requires the normal server-side conflict check
- `GET /api/catalog` → tenant-scoped service catalog for consistent estimates and landing-page vocabulary
- `POST /api/catalog` → add a tenant-specific pricebook item; owner and dispatcher roles may write, while other roles remain read-only
- `GET /api/assets` and `POST /api/assets` → tenant-scoped customer equipment records for repeat service context
- `GET /api/notifications` → tenant-scoped action queue for new leads, unassigned jobs, unpaid invoices, and approaching renewals
- `POST /api/notifications/:id/read` → acknowledge a currently active tenant notification without deleting its source record
- `GET /api/reviews` → tenant-scoped completed-job ratings and comments
- `GET /api/export?type=reviews` → tenant-scoped review history CSV for owner reporting
- `GET /api/materials` and `POST /api/materials` → tenant-scoped inventory records with stock and reorder thresholds
- `POST /api/jobs/:id/materials` → consume stocked material against a tenant-owned job and append an inventory transaction
- `GET /api/purchase-orders`, `POST /api/purchase-orders`, and `POST /api/purchase-orders/:id/receive` → create and receive replenishment orders with automatic stock reconciliation
- `GET /api/job-costs` and `POST /api/jobs/:id/labor` → view tenant-scoped job profitability and log labor cost against a job
- `GET /api/payments` → tenant-scoped payment ledger for reconciliation and accounting handoff
- `GET /api/export?type=customers|leads|estimates|invoices|payments|plans|activities|dispatch|assets` → tenant-scoped CSV export for owner reporting and accounting handoff
- `POST /api/jobs` → create a job after server-side tenant and role checks
- `POST /api/leads/:id/convert` → convert a tenant-owned lead into a customer and scheduled job while preserving lead attribution
- `POST /api/jobs/:id/assign` and `POST /api/jobs/:id/status` → update a tenant-owned job's technician and lifecycle state
- `POST /api/jobs/:id/reschedule` → change the appointment time without recreating the job
- Assignment and rescheduling reject active same-technician/time conflicts with `409 technician_schedule_conflict`
- `POST /api/jobs/:id/complete` → complete assigned work with a required note, timestamp, and automatic customer timeline event
- `POST /api/jobs/:id/technician-link` → issue a 24-hour, job-scoped technician mobile link for an assigned job
- `GET/POST /api/public/technician-job...` → technician-safe job detail and status/completion updates through the signed link
- `POST /api/public/technician-job/payment-intent?token=...` → create an idempotent provider-pending Card/ACH intent only for the assigned job's open invoice; provider confirmation remains external
- New jobs include a required three-step field checklist; `POST /api/public/technician-job/checklist?token=...` updates checklist items and technician completion rejects incomplete work
- `POST /api/public/technician-job/photo?token=...` → attach up to 20 bounded HTTPS photo references with captions to the assigned job; production should replace URLs with signed object-storage uploads
- The technician page queues field `POST` actions locally during transient offline periods and replays them in order on reconnect; the prototype queue is device-local and production needs encrypted storage, retry limits, and conflict handling
- Dispatch assignment, status, and reschedule mutations append auditable customer timeline events
- `POST /api/jobs/:id/customer-link` → issue a 72-hour customer portal link scoped to the job's customer
- `POST /api/jobs/:id/review-link` → issue a 72-hour review link for a completed job
- `GET /api/public/customer-portal?token=...` → customer-safe appointments, equipment, estimates, invoices, and service plans
- `POST /api/public/customer-portal/confirm?token=...` → confirm a customer-owned appointment idempotently and append a customer timeline event
- `POST /api/public/customer-portal/request?token=...` → accept a customer reschedule request or question and route it into the owner action queue
- `POST /api/public/customer-portal/confirm?token=...` → confirm a customer-owned appointment idempotently and append a customer timeline event
- `POST /api/requests/:id/resolve` → resolve a tenant-owned customer request with an optional owner note
- `GET/POST /api/public/review?token=...` → read review state or submit one 1–5 rating and optional comment; duplicate submissions are rejected
- `GET /api/plans` and `POST /api/plans` → list or create recurring service plans
- `POST /api/plans/:id/renew` → renew a tenant-owned service plan and optionally schedule its next visit with `time`
- `GET /api/activities` and `POST /api/activities` → read or log tenant-owned customer calls, messages, and notes
- `GET /api/audit` and `GET /api/export?type=audit` → read or export a tenant-scoped event ledger for workflow traceability; prototype activity events use a system actor and production should attach verified identity/provider actors
- `GET /api/messages` and `POST /api/messages` → list or queue tenant-owned SMS/email messages; delivery remains provider-dependent until an external messaging service is connected
- `POST /api/jobs/:id/notify` → queue a tenant-owned confirmation, en-route, or completed message from job context; delivery remains provider-dependent and the message is linked to the job

System events such as web-form lead capture, customer estimate approval, and recorded payment are appended to the same activity timeline automatically.
- `POST /api/auth/logout` → revoke the current session
- `POST /api/estimates` → create a draft estimate
- `POST /api/estimates` accepts an optional `catalogItemId` and snapshots the tenant pricebook item on the estimate so later catalog edits do not rewrite historical quotes
- `POST /api/estimates` also accepts up to three labeled `options`; public approval may include `optionId`, which snapshots the selected amount before quote-to-cash conversion
- `POST /api/estimates/:id/approve` → approve a tenant-owned estimate
- `POST /api/estimates/:id/convert` → convert an accepted estimate into a scheduled, checklist-ready job
- `POST /api/invoices` → create an invoice only from an approved estimate
- `POST /api/invoices/:id/pay` → record a full or partial tenant-owned invoice payment with method/reference; returns updated balance and payment ledger entry
- `POST /api/invoices/:id/payment-link` → issue a 72-hour invoice payment link for the owner to share
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
