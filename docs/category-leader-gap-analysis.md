# Category-leader parity brief

Northstar is designed for local-service brands whose customers arrive through separate landing pages: plumbing, electrical, pressure washing, mobile car washing, and similar trades. The landing page is the acquisition edge; the owner portal must be the operational system behind it.

## Current product direction

The repository already covers the core service-business loop:

- landing-page lead and booking intake with tenant routing and attribution;
- owner workspace setup, customer and location records, pricebook/catalog, estimates, jobs, invoices, payments, service plans, dispatch, route optimization, route-calendar export, technician field tools, and customer portal flows;
- service-agreement billing cadence support and an owner agreement-health report;
- retry-safe public and field endpoints with idempotency, audit records, offline replay boundaries, and production configuration checks.
- multi-technician dispatch assignment with server-side skill and schedule-conflict validation.

## Completed parity milestone: structured form definitions

Northstar now carries bounded structured form definitions with each job snapshot. This closes the most important gap between a named checklist and a category-leading field form workflow, while preserving the legacy payload for older services.

The implementation now includes:

1. `formDefinitions` to a catalog item and the corresponding pricebook snapshot. Each definition should contain a bounded list of fields with `id`, `label`, `type`, `required`, `options`, and an optional `showWhen` rule.
2. Job creation that copies the sanitized definition into `requiredForms`, so later pricebook edits cannot change an active job.
3. A technician renderer for text, number, date, select, and boolean fields. Conditional fields should be evaluated deterministically on the client for usability and again on the server for trust.
4. Server validation that rejects missing visible required fields, invalid select values, invalid booleans/numbers, oversized answers, unknown field ids, and answers submitted for a form that is not required on the job.
5. Backward compatibility: the existing `formName`, `result`, `notes`, and `customerSignature` payload remains valid for legacy forms with no field definition.
6. Owner setup and pricebook UI for editing and previewing definitions through a bounded visual builder for form names, field types, select options, required fields, and conditional visibility; an advanced JSON editor remains available for migrations. Contract tests prove tenant isolation, snapshot behavior, conditional visibility, configured-catalog booking, and completion blocking. The structured-form runtime suite is part of the main CI contract.

## Next parity milestone: production activation

The remaining category-leader boundary is operational activation rather than another local mock: managed shared storage, real identity and provider credentials, verified hosted deployment, monitoring, backups, and tested recovery procedures. The repository contains the server-side seams and readiness gates for those integrations; deployment evidence is still required before calling the system production-equivalent.

The owner settings workspace now makes the landing-page activation path explicit with a tenant-scoped launch checklist. It combines the business profile, public contact, active pricebook, field team, attached service key, guided intake, service-area review, and deployment readiness gate without exposing credentials or treating local preview data as production evidence.

## Landing-page-specific guardrails

- Never let a public landing page choose a tenant by trusting an arbitrary tenant id. Continue deriving the tenant from the configured service slug and enforce allowed origins in production.
- Keep public intake answers and technician answers bounded, sanitized, and tenant-scoped. Do not expose owner-only records through the public catalog or technician token.
- Preserve the landing-page integration contract while extending capabilities. Future agents should update `PORTAL_CONTRACT.md`, the service capability manifest, and the relevant UI/runtime contract tests together.
- Treat a local test server, HTTP 200, or a pushed commit as development evidence—not proof of a production deployment. Production still needs managed shared storage, real identity/provider credentials, monitoring, backups, and a verified hosted domain.

## Reference point

This roadmap is informed by the public ServiceTitan feature surface: service agreements, scheduling and dispatch, customer portal, forms with conditional logic, technician tools, inventory, job costing, and billing. Northstar should compete on a simpler multi-tenant landing-page integration, transparent ownership, safer defaults, and workflows that are practical for small trade operators.
