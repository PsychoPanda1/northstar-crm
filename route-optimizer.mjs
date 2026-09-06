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

const respectsTimeWindows = (ordered) => ordered.every((item, index) => {
  if (!index) return true;
  const previousEnd = Date.parse(ordered[index - 1].job.endsAt || '');
  const currentStart = Date.parse(item.job.startsAt || '');
  return !Number.isFinite(previousEnd) || !Number.isFinite(currentStart) || previousEnd <= currentStart;
});

export const optimizeCoordinateRoute = (stops, start = null, options = {}) => {
  const respectTimeWindows = options.respectTimeWindows !== false;
  const remaining = stops.slice().sort((a, b) => Date.parse(a.job.startsAt || '') - Date.parse(b.job.startsAt || '') || a.job.id.localeCompare(b.job.id));
  const ordered = [];
  let current = start || remaining[0]?.coordinates || null;
  while (remaining.length) {
    remaining.sort((a, b) => {
      const aDistance = current ? distanceKmBetween(current, a.coordinates) : 0;
      const bDistance = current ? distanceKmBetween(current, b.coordinates) : 0;
      return aDistance - bDistance || Date.parse(a.job.startsAt || '') - Date.parse(b.job.startsAt || '') || a.job.id.localeCompare(b.job.id);
    });
    const next = remaining.shift();
    ordered.push(next);
    current = next.coordinates;
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
        if (respectTimeWindows && !respectsTimeWindows(candidate)) continue;
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
  return { ordered, distanceKm: Number(routeDistanceKm(ordered, start).toFixed(2)), passes, method: respectTimeWindows ? 'coordinate_nearest_neighbor_2opt_time_safe' : 'coordinate_nearest_neighbor_2opt' };
};
