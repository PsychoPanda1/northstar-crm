# Northstar portal contract

Northstar is the owner-facing portal attached to service-business landing pages. Landing pages may link owners to `/portal?service=plumbing` during the demo phase. Production must resolve the tenant from the authenticated session on the server.

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

- `POST /api/public/leads` → accept a constrained landing-page inquiry using a service key; production must add validation, rate limiting, spam protection, and durable storage
- `GET /api/session` → `{ owner, tenant, permissions }`
- `GET /api/customers` and `POST /api/customers` → list or create tenant-owned customer profiles
- `GET /api/dashboard?range=week` → `{ metrics, pipeline, tasks, schedule, activity }`
- `GET /api/reports/overview` → tenant-scoped funnel, scheduling, cash, recurring-revenue, and touchpoint metrics
- `GET /api/team` → tenant-scoped technician roster used for assignment validation
- `GET /api/catalog` → tenant-scoped service catalog for consistent estimates and landing-page vocabulary
- `GET /api/notifications` → tenant-scoped action queue for unassigned jobs, unpaid invoices, and approaching renewals
- `POST /api/jobs` → create a job after server-side tenant and role checks
- `POST /api/leads/:id/convert` → convert a tenant-owned lead into a customer and scheduled job while preserving lead attribution
- `POST /api/jobs/:id/assign` and `POST /api/jobs/:id/status` → update a tenant-owned job's technician and lifecycle state
- `POST /api/jobs/:id/reschedule` → change the appointment time without recreating the job
- `GET /api/plans` and `POST /api/plans` → list or create recurring service plans
- `POST /api/plans/:id/renew` → renew a tenant-owned service plan
- `GET /api/activities` and `POST /api/activities` → read or log tenant-owned customer calls, messages, and notes

System events such as web-form lead capture, customer estimate approval, and recorded payment are appended to the same activity timeline automatically.
- `POST /api/auth/logout` → revoke the current session
- `POST /api/estimates` → create a draft estimate
- `POST /api/estimates/:id/approve` → approve a tenant-owned estimate
- `POST /api/invoices` → create an invoice only from an approved estimate
- `POST /api/invoices/:id/pay` → record payment against a tenant-owned invoice

## Data model starting point

Use `tenantId` on every business record: `customers`, `locations`, `leads`, `jobs`, `estimates`, `payments`, `tasks`, `teamMembers`, and `activityEvents`. Keep `ownerId` and role permissions separate from business records.

## Future-agent checklist

- Preserve the tenant and auth boundary when adding routes.
- Keep service-specific copy in configuration, not duplicated markup.
- Add an authorization test for every tenant-scoped read and write.
- Replace the demo login modal only after a real identity provider and session API exist.
