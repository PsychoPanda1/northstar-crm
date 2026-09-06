# Northstar field-service parity matrix

This is the working scope map for the CRM. It keeps future agents focused on the complete service-business lifecycle rather than treating isolated passing tests as product completion.

The comparison domains are based on [ServiceTitan's feature areas](https://www.servicetitan.com/features) and its [product-area reference](https://help.servicetitan.com/docs/product-areas), with [Jobber's online-booking and client-communication workflows](https://help.getjobber.com/en/articles/online-booking/) used as a small-business usability reference.

| Domain | Northstar today | Evidence | Remaining work before production parity |
| --- | --- | --- | --- |
| Customer and location records | Implemented | Customer profiles, saved locations, assets, tags, preferences, merge, service history | Connect managed shared storage and operational data retention policy |
| Lead capture and sales pipeline | Implemented | Idempotent landing-page intake, attribution, SLA alerts, owner-configurable tenant stages, stage/owner/source filtering, assignment, conversion | Add production marketing connectors |
| Call booking and contact center | Implemented | Signed inbound call webhook, customer matching, outcomes, booking, audit history | Connect a real telephony provider and verify webhook replay/rotation operations |
| Pricebook and estimates | Implemented | Tenant catalog, duration-aware capacity, itemized estimates, included-work option packages, revisions, signed PDF artifact, send/approve/decline, conversion | Connect production outbound document delivery provider |
| Scheduling and dispatch | Implemented | Day/week views, capacity, conflict checks, technician recommendations, coordinate-aware 2-opt route optimization, signed fleet telemetry, stale-location alerts, manual route ordering, map handoff, reminders, no-show recovery, rebooks | Connect a production GPS provider and larger-scale time-window optimization |
| Technician field operations | Implemented | Signed mobile job access, customer context, checklists/forms, photos, findings, labor/material capture, clocking, completion | Add encrypted managed offline sync and conflict resolution |
| Customer experience | Implemented | Customer portal, booking, reschedule/cancel, requests, payment intents, financing intents, review links, preference controls | Connect production payment/financing providers and customer messaging channels |
| Invoicing and payments | Implemented | Invoice creation, receipts, payment schedules, reminders, secure payment links, signed settlement webhook, retry queues | Configure live payment provider, reconciliation, refunds, and tax/accounting integrations |
| Inventory, fleet, and job costing | Implemented | Materials, locations, transfers, purchase orders, receiving/matching, barcode/SKU lookup, vehicles, labor/material costs, profitability reports | Add warehouse integrations and production accounting synchronization |
| Reporting and marketing attribution | Implemented | Funnel, marketing, technician, payroll, receivables, exports, source/campaign preservation | Add durable analytics warehouse and configurable KPI/report builder |
| Identity, tenant isolation, and release controls | Prototype-ready | OIDC seam, role permissions, tenant-scoped APIs, restart-safe revocation, CORS, rate limits, container release workflow | Configure a real identity provider, managed multi-writer storage, secret rotation, monitoring, backups, and deployment verification |

## Completion standard

Northstar should not be called production-equivalent until the remaining-work column is resolved for the deployment being launched. Local HTTP success, demo login, or a green unit/integration suite proves implementation quality for the checked path; it does not prove provider configuration, production identity, shared storage, or a live release.

The canonical verification command is `npm test`. The public landing-page contract remains [openapi.yaml](openapi.yaml), and the implementation handoff is [LANDING_PAGE_INTEGRATION.md](LANDING_PAGE_INTEGRATION.md).
