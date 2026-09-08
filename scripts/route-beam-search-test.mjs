import { optimizeCoordinateRoute } from '../route-optimizer.mjs';

const stop = (id, start, end, latitude, longitude) => ({
  job: { id, startsAt: start, endsAt: end },
  coordinates: { latitude, longitude }
});

const stops = [
  stop('a', '2026-09-08T13:00:00.000Z', '2026-09-08T13:30:00.000Z', 32.8000, -79.9000),
  stop('b', '2026-09-08T13:35:00.000Z', '2026-09-08T14:05:00.000Z', 32.8010, -79.8990),
  stop('c', '2026-09-08T14:10:00.000Z', '2026-09-08T14:40:00.000Z', 32.8020, -79.8980),
  stop('d', '2026-09-08T14:45:00.000Z', '2026-09-08T15:15:00.000Z', 32.8030, -79.8970),
  stop('e', '2026-09-08T15:20:00.000Z', '2026-09-08T15:50:00.000Z', 32.8040, -79.8960),
  stop('f', '2026-09-08T15:55:00.000Z', '2026-09-08T16:25:00.000Z', 32.8050, -79.8950)
];
const depot = { latitude: 32.7990, longitude: -79.9010 };
const first = optimizeCoordinateRoute(stops, depot, { travelSpeedKph: 32 });
const second = optimizeCoordinateRoute(stops, depot, { travelSpeedKph: 32 });

if (first.method !== 'coordinate_beam_search_2opt_travel_time_safe') throw new Error('larger time-window routes did not use bounded beam search');
if (first.timeWindowFeasible !== true || first.ordered.length !== stops.length) throw new Error('beam search returned an incomplete or infeasible route');
if (first.ordered.map((item) => item.job.id).join(',') !== second.ordered.map((item) => item.job.id).join(',') || first.distanceKm !== second.distanceKm) throw new Error('beam search was not deterministic');
console.log('Northstar larger time-window route test passed');
