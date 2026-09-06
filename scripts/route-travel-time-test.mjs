import { estimatedTravelMinutes, optimizeCoordinateRoute } from '../route-optimizer.mjs';

const job = (id, start, end, latitude, longitude) => ({ job: { id, startsAt: start, endsAt: end }, coordinates: { latitude, longitude } });
const stops = [job('a', '2026-09-07T13:00:00.000Z', '2026-09-07T13:30:00.000Z', 32.8000, -79.9000), job('b', '2026-09-07T14:30:00.000Z', '2026-09-07T15:00:00.000Z', 32.9500, -79.9000), job('c', '2026-09-07T15:15:00.000Z', '2026-09-07T15:45:00.000Z', 32.9510, -79.9000)];
const optimized = optimizeCoordinateRoute(stops, { latitude: 32.8000, longitude: -79.9000 }, { travelSpeedKph: 32 });
if (optimized.method !== 'coordinate_nearest_neighbor_2opt_travel_time_safe' || !Number.isFinite(optimized.estimatedTravelMinutes) || optimized.ordered.map((item) => item.job.id).join(',') !== 'a,b,c') throw new Error('travel-time-safe route optimization failed');
if (estimatedTravelMinutes(optimized.ordered, { latitude: 32.8000, longitude: -79.9000 }, 32) !== optimized.estimatedTravelMinutes) throw new Error('travel estimate is not deterministic');
console.log('Northstar travel-time route test passed');
