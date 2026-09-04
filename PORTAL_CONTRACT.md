# Northstar portal contract

Northstar is the owner-facing portal attached to service-business landing pages. Landing pages may link owners to `/portal?service=plumbing` during the demo phase. Production must resolve the tenant from the authenticated session on the server.

## Current demo seam

- `tenant-config.js` contains presentation-only configurations for plumbing, power washing, electrical, mobile car wash, and a home-services default.
- `app.js` applies the selected tenant name, service label, accent, and dashboard focus line.
- The owner sign-in dialog is intentionally a demo boundary. It does not collect, transmit, or validate credentials.

## Production boundary

1. Landing page: lead capture and owner-login link, with no direct access to another tenant's data.
2. Identity service: authenticate the owner and return a short-lived session with `ownerId` and `tenantId`.
3. Portal API: authorize every query and mutation against the session's `tenantId`; never use a query-string tenant as an authorization decision.
4. Northstar UI: consume a tenant-scoped API and render the appropriate service vocabulary, workflows, and metrics.

## Recommended API shape

- `GET /api/session` → `{ owner, tenant, permissions }`
- `GET /api/dashboard?range=week` → `{ metrics, pipeline, tasks, schedule, activity }`
- `POST /api/jobs` → create a job after server-side tenant and role checks
- `POST /api/auth/logout` → revoke the current session

## Data model starting point

Use `tenantId` on every business record: `customers`, `locations`, `leads`, `jobs`, `estimates`, `payments`, `tasks`, `teamMembers`, and `activityEvents`. Keep `ownerId` and role permissions separate from business records.

## Future-agent checklist

- Preserve the tenant and auth boundary when adding routes.
- Keep service-specific copy in configuration, not duplicated markup.
- Add an authorization test for every tenant-scoped read and write.
- Replace the demo login modal only after a real identity provider and session API exist.
