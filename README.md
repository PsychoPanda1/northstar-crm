# Northstar CRM

Northstar is a polished, responsive CRM dashboard concept for field-service businesses. It is designed around the operator's real day: understand revenue, follow up on the right opportunities, see technician capacity, and keep every customer interaction connected.

## Included in this MVP

- Revenue, jobs, estimates, and customer satisfaction KPIs
- Revenue pipeline with stage values
- Today's focus list with interactive task completion
- Schedule view with job status, technician assignment, and customer context
- Recent activity stream
- Responsive layout for desktop and mobile

## Run locally

This is intentionally dependency-free. Open `index.html` directly, or serve the folder with any static server:

```powershell
python -m http.server 4173
```

Then visit http://localhost:4173.

## Next product slices

The next implementation layer should add persistent data and auth, customer profiles with a full timeline, drag-and-drop dispatch, estimate creation, technician mobile workflows, and role-aware reporting. The current UI is a frontend foundation with a clear component/data boundary for that work.
