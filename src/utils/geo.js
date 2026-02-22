// Haversine distance between two points in km
export const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Calculate minimum distance from a POI to the REAL route polyline
export const minDistanceToRoute = (poiLat, poiLng, routeGeometry) => {
    if (!routeGeometry || routeGeometry.length === 0) return Infinity;

    let minDist = Infinity;
    const step = Math.max(1, Math.floor(routeGeometry.length / 500));

    let bestIdx = 0;
    for (let i = 0; i < routeGeometry.length; i += step) {
        const [rLat, rLng] = routeGeometry[i];
        const dist = haversineKm(poiLat, poiLng, rLat, rLng);
        if (dist < minDist) {
            minDist = dist;
            bestIdx = i;
        }
    }

    // Refine near the best sampled point
    const start = Math.max(0, bestIdx - step);
    const end = Math.min(routeGeometry.length - 1, bestIdx + step);
    for (let i = start; i <= end; i++) {
        const [rLat, rLng] = routeGeometry[i];
        const dist = haversineKm(poiLat, poiLng, rLat, rLng);
        if (dist < minDist) {
            minDist = dist;
        }
    }

    return minDist;
};

// Vectorial direction check: is the POI "ahead" of the origin and "before" the destination?
export const isPoiForward = (poiLat, poiLng, origin, dest) => {
    if (!origin || !dest) return true;

    const vX = dest.lat - origin.lat;
    const vY = dest.lng - origin.lng;
    const pX = poiLat - origin.lat;
    const pY = poiLng - origin.lng;

    const dotProduct = pX * vX + pY * vY;
    if (dotProduct < 0) return false;

    const magSq = vX * vX + vY * vY;
    if (dotProduct > magSq) return false;

    return true;
};
