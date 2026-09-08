const toRadians = (value) => value * Math.PI / 180;

export const distanceKmBetween = (a, b) => {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const latitudeA = toRadians(a.latitude);
  const latitudeB = toRadians(b.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(Math.max(0, 1 - haversine)));
};

const routeDistanceKm = (ordered, start) => {
  if (!ordered.length) return 0;
  let total = start ? distanceKmBetween(start, ordered[0].coordinates) : 0;
  for (let index = 1; index < ordered.length; index += 1) total += distanceKmBetween(ordered[index - 1].coordinates, ordered[index].coordinates);
  return total;
};

export const estimatedTravelMinutes = (ordered, start = null, speedKph = 32) => {
  const speed = Number(speedKph);
  if (!Number.isFinite(speed) || speed <= 0) return null;
  const points = ordered.map((item) => item.coordinates);
  let previous = start;
  let minutes = 0;
  for (const point of points) { if (previous) minutes += distanceKmBetween(previous, point) / speed * 60; previous = point; }
  return Math.round(minutes);
};

const respectsTimeWindows = (ordered, start, speedKph) => {
  let previousPoint = start;
  let availableAt = null;
  for (const item of ordered) {
    const currentStart = Date.parse(item.job.startsAt || '');
    const previousTravelMinutes = previousPoint && speedKph ? distanceKmBetween(previousPoint, item.coordinates) / speedKph * 60 : 0;
    const earliestArrival = Number.isFinite(availableAt) ? availableAt + previousTravelMinutes * 60_000 : null;
    if (Number.isFinite(currentStart) && Number.isFinite(earliestArrival) && currentStart < earliestArrival) return false;
    const currentEnd = Date.parse(item.job.endsAt || '');
    availableAt = Number.isFinite(currentEnd) ? currentEnd : Number.isFinite(currentStart) ? currentStart : availableAt;
    previousPoint = item.coordinates;
  }
  return true;
};

const compareStart = (a, b) => {
  const aStart = Date.parse(a.job.startsAt || '');
  const bStart = Date.parse(b.job.startsAt || '');
  if (Number.isFinite(aStart) && Number.isFinite(bStart)) return aStart - bStart || a.job.id.localeCompare(b.job.id);
  if (Number.isFinite(aStart)) return -1;
  if (Number.isFinite(bStart)) return 1;
  return a.job.id.localeCompare(b.job.id);
};

const nearestNeighborRoute = (stops, start, respectTimeWindows, travelSpeedKph, seed = null) => {
  const remaining = stops.slice().sort(compareStart);
  const ordered = [];
  let current = start || null;
  if (seed) {
    const seedIndex = remaining.findIndex((item) => item.job.id === seed.job.id);
    if (seedIndex >= 0) {
      const first = remaining.splice(seedIndex, 1)[0];
      ordered.push(first);
      current = first.coordinates;
    }
  }
  while (remaining.length) {
    const feasible = respectTimeWindows && travelSpeedKph && ordered.length
      ? remaining.filter((candidate) => respectsTimeWindows([...ordered, candidate], start, travelSpeedKph))
      : remaining;
    const candidates = feasible.length ? feasible : remaining;
    candidates.sort((a, b) => {
      if (respectTimeWindows && travelSpeedKph && !ordered.length) return compareStart(a, b);
      const aDistance = current ? distanceKmBetween(current, a.coordinates) : 0;
      const bDistance = current ? distanceKmBetween(current, b.coordinates) : 0;
      return aDistance - bDistance || compareStart(a, b);
    });
    const next = candidates[0];
    remaining.splice(remaining.indexOf(next), 1);
    ordered.push(next);
    current = next.coordinates;
  }
  return ordered;
};

export const optimizeCoordinateRoute = (stops, start = null, options = {}) => {
  const respectTimeWindows = options.respectTimeWindows !== false;
  const travelSpeedKph = Number.isFinite(Number(options.travelSpeedKph)) && Number(options.travelSpeedKph) > 0 ? Number(options.travelSpeedKph) : null;
  let ordered = nearestNeighborRoute(stops, start, respectTimeWindows, travelSpeedKph);
  if (!respectTimeWindows && !start && stops.length > 3) {
    const seeds = stops.slice().sort(compareStart).slice(0, Math.min(12, stops.length));
    for (const seed of seeds) {
      const candidate = nearestNeighborRoute(stops, null, false, travelSpeedKph, seed);
      if (routeDistanceKm(candidate, null) + 0.001 < routeDistanceKm(ordered, null)) ordered = candidate;
    }
  }
  let improved = true;
  let passes = 0;
  while (improved && passes < 20) {
    improved = false;
    passes += 1;
    const currentDistance = routeDistanceKm(ordered, start);
    for (let i = 0; i < ordered.length - 1; i += 1) {
      for (let k = i + 1; k < ordered.length; k += 1) {
        const candidate = ordered.slice(0, i).concat(ordered.slice(i, k + 1).reverse(), ordered.slice(k + 1));
        if (respectTimeWindows && !respectsTimeWindows(candidate, start, travelSpeedKph)) continue;
        const candidateDistance = routeDistanceKm(candidate, start);
        if (candidateDistance + 0.001 < currentDistance) {
          ordered.splice(0, ordered.length, ...candidate);
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }
  const timeWindowFeasible = !respectTimeWindows || respectsTimeWindows(ordered, start, travelSpeedKph);
  return { ordered, distanceKm: Number(routeDistanceKm(ordered, start).toFixed(2)), estimatedTravelMinutes: estimatedTravelMinutes(ordered, start, travelSpeedKph || 32), passes, timeWindowFeasible, method: respectTimeWindows ? (travelSpeedKph ? 'coordinate_nearest_neighbor_2opt_travel_time_safe' : 'coordinate_nearest_neighbor_2opt_time_safe') : 'coordinate_nearest_neighbor_2opt' };
};
