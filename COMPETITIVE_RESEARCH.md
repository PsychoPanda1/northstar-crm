# Field-service platform benchmark

Reviewed September 2026 against official product pages for [ServiceTitan](https://www.servicetitan.com/features), [Jobber](https://www.getjobber.com/features/), [Housecall Pro](https://www.housecallpro.com/features/), and [FieldEdge](https://fieldedge.com/).

## What the category leaders establish

| Capability | Evidence in the market | Northstar direction |
| --- | --- | --- |
| Lead-to-job lifecycle | ServiceTitan lists job booking, leads, estimates, proposals, and automated alerts; Housecall Pro highlights pipeline automation. | Make every landing-page lead traceable from source → conversation → estimate → scheduled job. |
| Dispatch and field execution | ServiceTitan emphasizes dispatch, technician mobile, tracking, forms, pricebook, equipment, and timesheets. | Add dispatch board, technician status, checklists, photos, and offline-safe field capture. |
| Cash collection | ServiceTitan, Jobber, and Housecall Pro connect estimates, invoices, online payments, and payment schedules. | Surface unpaid invoices, deposits, progress billing, and payment links as first-class owner actions. |
| Customer self-service | Jobber and Housecall Pro provide portals for requests, approvals, appointments, invoices, and payments. | Give each landing-page customer a secure status/approval/payments experience without exposing other tenants. |
| Retention and recurring work | ServiceTitan includes memberships; Jobber supports recurring visits and payment schedules. | Add service plans, recurring jobs, renewal dates, and reactivation campaigns. |
| Visibility and integrations | ServiceTitan and Jobber call out reporting, accounting sync, notifications, and APIs. | Keep a tenant-scoped event ledger and documented API boundary so future agents can integrate safely. |
| Assisted intake and live coordination | Jobber highlights an AI receptionist for calls/texts and real-time crew availability; ServiceTitan emphasizes dispatch adjustments and technician access to customer/job context. | Keep intake provider-neutral and auditable, then add optional assisted triage only behind explicit provider configuration; preserve human owner control over booking, assignment, and customer communication. |

## Product thesis

Northstar should compete on clarity and speed for multi-service operators: one owner portal, configured from a landing page, with an explainable path from demand to cash. The differentiator should be actionable “what needs attention next” views and transparent tenant boundaries—not a larger settings maze.

## Build order

1. Tenant-scoped auth/session API and persistent data.
2. Lead capture + source attribution from landing pages.
3. Estimate → approval → deposit/payment-link flow.
4. Dispatch board + technician mobile job completion.
5. Customer portal, recurring plans, review requests, and reactivation.
6. Reporting, accounting exports, and carefully scoped integrations.

## Current benchmark implication

The next product advantage should be explainable automation: detect urgency, suggest the next action, and preserve an auditable human approval point for consequential changes. Provider-backed AI or telephony must remain optional and server-side; the local CRM should never imply that a queued or simulated action was completed externally.

This benchmark is a product-design reference, not an endorsement of third-party pricing or an instruction to depend on any vendor.
