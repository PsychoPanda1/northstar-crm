# Northstar field-service parity matrix

This is the working scope map for the CRM. It keeps future agents focused on the complete service-business lifecycle rather than treating isolated passing tests as product completion.

The comparison domains are based on [ServiceTitan's feature areas](https://www.servicetitan.com/features) and its [product-area reference](https://help.servicetitan.com/docs/product-areas), with [Jobber's online-booking and client-communication workflows](https://help.getjobber.com/en/articles/online-booking/) used as a small-business usability reference.

| Domain | Northstar today | Evidence | Remaining work before production parity |
| --- | --- | --- | --- |
| Customer and location records | Implemented | Customer profiles, saved locations, assets, tags, preferences, merge, service history, owner-only privacy export | Connect managed shared storage and operational data retention policy |
| Lead capture and sales pipeline | Implemented | Idempotent landing-page intake, attribution, SLA alerts, owner-configurable tenant stages, stage/owner/source filtering, assignment, conversion, provider handoff with delivery state | Configure a production marketing connector and verify its replay/rotation operations |
| Call booking and contact center | Implemented | Signed inbound call webhook, customer matching, outcomes, booking, audit history | Connect a real telephony provider and verify webhook replay/rotation operations |
| Pricebook and estimates | Implemented | Tenant catalog, duration-aware capacity, itemized estimates, included-work option packages, revisions, signed PDF artifact, send/approve/decline, conversion, durable document-provider handoff | Configure and verify the production outbound document provider |
| Scheduling and dispatch | Implemented | Day/week views, multi-day work orders, capacity, conflict checks, technician recommendations, coordinate-aware 2-opt route optimization, optional travel-time-safe windows, signed fleet telemetry, stale-location alerts, manual route ordering, map handoff, reminders, no-show recovery, rebooks | Connect a production GPS provider and larger-scale time-window optimization |
| Technician field operations | Implemented | Signed mobile job access, customer context, scoped pre-job briefs, signed service field guides, checklists/forms, photos, findings, labor/material capture, clocking, completion, encrypted AES-GCM offline queue, idempotent replay, and conflict review | Move encrypted queue state to managed offline storage with cross-device conflict resolution |
| Customer experience | Implemented | Customer portal, booking, reschedule/cancel, requests, payment intents, financing intents, review links, preference controls, technician ETA updates, signed referral links | Connect production payment/financing providers and customer messaging channels |
| Invoicing and payments | Implemented | Invoice creation, receipts, payment schedules, reminders, secure payment links, signed settlement webhook, retry queues | Configure live payment provider, reconciliation, refunds, and tax/accounting integrations |
| Inventory, fleet, and job costing | Implemented | Materials, locations, transfers, purchase orders, receiving/matching, barcode/SKU lookup, vehicles, labor/material costs, profitability reports, provider-neutral warehouse and accounting handoff with durable delivery state | Configure live warehouse/accounting connectors and verify replay/rotation operations |
| Reporting and marketing attribution | Implemented | Funnel, marketing, technician, payroll, receivables, exports, source/campaign preservation, tenant-scoped persisted KPI profiles, reusable owner-defined report views, date windows, service/source/technician/status dimensions, visual comparisons, and automated aggregate CSV delivery through the message provider | Add durable analytics warehouse and richer cross-period visualization |
| Identity, tenant isolation, and release controls | Prototype-ready | OIDC seam, role permissions, tenant-scoped APIs, restart-safe revocation, CORS, rate limits, container release workflow | Configure a real identity provider, managed multi-writer storage, secret rotation, monitoring, backups, and deployment verification |

## Completion standard

Northstar should not be called production-equivalent until the remaining-work column is resolved for the deployment being launched. Local HTTP success, demo login, or a green unit/integration suite proves implementation quality for the checked path; it does not prove provider configuration, production identity, shared storage, or a live release.

The canonical verification command is `npm test`. The public landing-page contract remains [openapi.yaml](openapi.yaml), and the implementation handoff is [LANDING_PAGE_INTEGRATION.md](LANDING_PAGE_INTEGRATION.md).
