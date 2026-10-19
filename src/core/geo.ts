/**
 * MARS LANTERN — Planetary Geodesy & Coordinate Transformations
 * 
 * Mars uses planetocentric latitude (-90° to +90°) and east-positive longitude (0° to 360°E)
 * in accordance with IAU/NASA PDS standards.
 * 
 * Pure TypeScript — zero DOM, zero React. Shared between Web UI and MCP server.
 * Reference: MARS_LANTERN_SPEC.md §4
 */

export const MARS_RADIUS_KM = 3389.5; // Mars mean volumetric radius (NASA fact sheet)
export const MARS_EQUATORIAL_RADIUS_KM = 3396.2;
export const MARS_POLAR_RADIUS_KM = 3376.2;

/**
 * Normalizes longitude to Areocentric East-Positive 0°–360° range.
 */
export const normalizeLon360 = (lon: number): number => {
  if (!Number.isFinite(lon)) return 0;
  return ((lon % 360) + 360) % 360;
};

/**
 * Converts Areocentric East-Positive longitude (0°–360°E) to standard map display (-180° to +180°).
 * e.g., 226.2°E (Olympus Mons) -> -133.8°
 */
export const lon360ToDisplay = (lon: number): number => {
  const l = normalizeLon360(lon);
  return l > 180 ? l - 360 : l;
};

/**
 * Converts map display longitude (-180° to +180°) to Areocentric East-Positive (0°–360°E).
 * e.g., -133.8° -> 226.2°E
 */
export const displayToLon360 = (lon: number): number => {
  return normalizeLon360(lon);
};

/**
 * Clamps latitude to valid planetary bounds (-90° to +90°).
 */
export const clampLat = (lat: number): number => {
  if (!Number.isFinite(lat)) return 0;
  return Math.max(-90, Math.min(90, lat));
};

export interface LatLonE {
  lat: number;
  lonE: number;
}

/**
 * Great-circle distance between two Mars points via the Haversine formula.
 */
export function haversineKm(a: LatLonE, b: LatLonE, R?: number): number;
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  R?: number
): number;
export function haversineKm(
  arg1: number | LatLonE,
  arg2: number | LatLonE,
  arg3?: number,
  arg4?: number,
  arg5?: number
): number {
  let lat1: number, lon1: number, lat2: number, lon2: number, R: number;
  if (typeof arg1 === 'object' && typeof arg2 === 'object') {
    lat1 = arg1.lat;
    lon1 = arg1.lonE;
    lat2 = arg2.lat;
    lon2 = arg2.lonE;
    R = typeof arg3 === 'number' ? arg3 : MARS_RADIUS_KM;
  } else {
    lat1 = arg1 as number;
    lon1 = arg2 as number;
    lat2 = arg3 as number;
    lon2 = arg4 as number;
    R = typeof arg5 === 'number' ? arg5 : MARS_RADIUS_KM;
  }

  const rad = Math.PI / 180;
  const cLat1 = clampLat(lat1);
  const cLat2 = clampLat(lat2);
  const dLat = (cLat2 - cLat1) * rad;
  const dLon = (lon2 - lon1) * rad;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(cLat1 * rad) * Math.cos(cLat2 * rad) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  return R * c;
}

/**
 * Calculates initial bearing (forward azimuth) from point 1 to point 2 in degrees (0°–360°).
 */
export function initialBearingDeg(a: LatLonE, b: LatLonE): number;
export function initialBearingDeg(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number;
export function initialBearingDeg(
  arg1: number | LatLonE,
  arg2: number | LatLonE,
  arg3?: number,
  arg4?: number
): number {
  let lat1: number, lon1: number, lat2: number, lon2: number;
  if (typeof arg1 === 'object' && typeof arg2 === 'object') {
    lat1 = arg1.lat;
    lon1 = arg1.lonE;
    lat2 = arg2.lat;
    lon2 = arg2.lonE;
  } else {
    lat1 = arg1 as number;
    lon1 = arg2 as number;
    lat2 = arg3 as number;
    lon2 = arg4 as number;
  }

  const rad = Math.PI / 180;
  const phi1 = clampLat(lat1) * rad;
  const phi2 = clampLat(lat2) * rad;
  // Shortest delta longitude along sphere (-180 to +180)
  const normLon1 = normalizeLon360(lon1);
  const normLon2 = normalizeLon360(lon2);
  const dLonDeg = ((normLon2 - normLon1 + 540) % 360) - 180;
  const deltaLambda = dLonDeg * rad;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}

/**
 * Calculates final bearing from point a to point b in degrees (0°–360°).
 */
export function finalBearingDeg(a: LatLonE, b: LatLonE): number {
  return (initialBearingDeg(b, a) + 180) % 360;
}

/**
 * Computes destination point given start point, initial bearing, and distance along the Martian sphere.
 */
export function destinationPoint(
  a: LatLonE,
  bearingDeg: number,
  distKm: number,
  R: number = MARS_RADIUS_KM
): LatLonE {
  const rad = Math.PI / 180;
  const delta = distKm / R;
  const theta = bearingDeg * rad;
  const phi1 = clampLat(a.lat) * rad;
  const lambda1 = normalizeLon360(a.lonE) * rad;

  const sinPhi2 =
    Math.sin(phi1) * Math.cos(delta) +
    Math.cos(phi1) * Math.sin(delta) * Math.cos(theta);
  const phi2 = Math.asin(Math.max(-1, Math.min(1, sinPhi2)));

  const y = Math.sin(theta) * Math.sin(delta) * Math.cos(phi1);
  const x = Math.cos(delta) - Math.sin(phi1) * sinPhi2;
  const lambda2 = lambda1 + Math.atan2(y, x);

  const lat = (phi2 * 180) / Math.PI;
  const lonE = normalizeLon360((lambda2 * 180) / Math.PI);
  return { lat, lonE };
}

/**
 * Generates an interpolated great-circle arc between two points using spherical slerp.
 */
export function greatCircleArc(
  a: LatLonE,
  b: LatLonE,
  stepKm: number = 1,
  maxPoints: number = 400
): LatLonE[] {
  const rad = Math.PI / 180;
  const lat1 = clampLat(a.lat);
  const lon1 = normalizeLon360(a.lonE);
  const lat2 = clampLat(b.lat);
  const lon2 = normalizeLon360(b.lonE);

  const distKm = haversineKm(lat1, lon1, lat2, lon2);
  if (distKm < 1e-4) {
    return [{ lat: lat1, lonE: lon1 }];
  }

  const numPoints = Math.min(
    maxPoints,
    Math.max(2, Math.ceil(distKm / stepKm) + 1)
  );

  const phi1 = lat1 * rad;
  const lam1 = lon1 * rad;
  const v1 = [
    Math.cos(phi1) * Math.cos(lam1),
    Math.cos(phi1) * Math.sin(lam1),
    Math.sin(phi1)
  ];

  const phi2 = lat2 * rad;
  const lam2 = lon2 * rad;
  const v2 = [
    Math.cos(phi2) * Math.cos(lam2),
    Math.cos(phi2) * Math.sin(lam2),
    Math.sin(phi2)
  ];

  const dot = Math.max(-1, Math.min(1, v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]));
  const omega = Math.acos(dot);

  if (Math.abs(omega) < 1e-6) {
    return [{ lat: lat1, lonE: lon1 }, { lat: lat2, lonE: lon2 }];
  }

  const sinOmega = Math.sin(omega);
  const points: LatLonE[] = [];

  for (let i = 0; i < numPoints; i++) {
    const f = i / (numPoints - 1);
    let vx: number, vy: number, vz: number;

    if (Math.abs(sinOmega) < 1e-6) {
      vx = (1 - f) * v1[0] + f * v2[0];
      vy = (1 - f) * v1[1] + f * v2[1];
      vz = (1 - f) * v1[2] + f * v2[2];
      const norm = Math.sqrt(vx * vx + vy * vy + vz * vz);
      vx /= norm;
      vy /= norm;
      vz /= norm;
    } else {
      const aCoeff = Math.sin((1 - f) * omega) / sinOmega;
      const bCoeff = Math.sin(f * omega) / sinOmega;
      vx = aCoeff * v1[0] + bCoeff * v2[0];
      vy = aCoeff * v1[1] + bCoeff * v2[1];
      vz = aCoeff * v1[2] + bCoeff * v2[2];
    }

    const lat = (Math.asin(Math.max(-1, Math.min(1, vz))) * 180) / Math.PI;
    const lonE = normalizeLon360((Math.atan2(vy, vx) * 180) / Math.PI);
    points.push({ lat, lonE });
  }

  return points;
}

/**
 * Splits an arc of points at the antimeridian (display lon ±180°) to prevent
 * Leaflet equirectangular polylines from wrapping horizontally across the map.
 */
export function splitArcAtAntimeridian(arc: LatLonE[]): LatLonE[][] {
  if (arc.length <= 1) return [arc];
  const polylines: LatLonE[][] = [];
  let currentSegment: LatLonE[] = [arc[0]];

  for (let i = 1; i < arc.length; i++) {
    const prev = arc[i - 1];
    const curr = arc[i];
    const prevDisplayLon = lon360ToDisplay(prev.lonE);
    const currDisplayLon = lon360ToDisplay(curr.lonE);

    if (Math.abs(currDisplayLon - prevDisplayLon) > 180) {
      // Crossed antimeridian: interpolate boundary point
      const f =
        prevDisplayLon > 0
          ? (180 - prevDisplayLon) /
            (180 - prevDisplayLon + (currDisplayLon - -180))
          : (-180 - prevDisplayLon) /
            (-180 - prevDisplayLon + (currDisplayLon - 180));

      const midLat = prev.lat + f * (curr.lat - prev.lat);
      const exitLon = prevDisplayLon > 0 ? 180 : 180;
      currentSegment.push({ lat: midLat, lonE: exitLon });
      polylines.push(currentSegment);

      currentSegment = [{ lat: midLat, lonE: exitLon }, curr];
    } else {
      currentSegment.push(curr);
    }
  }

  if (currentSegment.length > 0) {
    polylines.push(currentSegment);
  }

  return polylines;
}

/**
 * Calculates perpendicular cross-track distance in km from point p to the great circle defined by (a, b).
 */
export function crossTrackKm(
  p: LatLonE,
  a: LatLonE,
  b: LatLonE,
  R: number = MARS_RADIUS_KM
): number {
  const distAP = haversineKm(a, p, R);
  const distAB = haversineKm(a, b, R);
  if (distAB < 1e-4) {
    return distAP;
  }
  const rad = Math.PI / 180;
  const delta13 = distAP / R;
  const theta13 = initialBearingDeg(a, p) * rad;
  const theta12 = initialBearingDeg(a, b) * rad;

  const sinDeltaXt = Math.sin(delta13) * Math.sin(theta13 - theta12);
  const deltaXt = Math.asin(Math.max(-1, Math.min(1, sinDeltaXt)));
  return Math.abs(deltaXt) * R;
}

/**
 * Calculates shortest distance from point p to a finite great-circle segment [a, b],
 * properly clamping to segment endpoints if the perpendicular projection falls outside.
 */
export function pointToSegmentDistanceKm(
  p: LatLonE,
  a: LatLonE,
  b: LatLonE,
  R: number = MARS_RADIUS_KM
): number {
  const distAB = haversineKm(a, b, R);
  const distAP = haversineKm(a, p, R);
  if (distAB < 1e-4) {
    return distAP;
  }
  const rad = Math.PI / 180;
  const delta13 = distAP / R;
  const theta13 = initialBearingDeg(a, p) * rad;
  const theta12 = initialBearingDeg(a, b) * rad;

  const dTheta = Math.cos(theta13 - theta12);
  if (dTheta < 0) {
    // Falls behind point A
    return distAP;
  }

  const sinDeltaXt = Math.sin(delta13) * Math.sin(theta13 - theta12);
  const deltaXt = Math.asin(Math.max(-1, Math.min(1, sinDeltaXt)));

  // Along-track angular distance
  const cosDeltaXt = Math.cos(deltaXt);
  if (Math.abs(cosDeltaXt) < 1e-7) {
    return distAP;
  }
  const cosDeltaAt = Math.cos(delta13) / cosDeltaXt;
  const deltaAt = Math.acos(Math.max(-1, Math.min(1, cosDeltaAt)));
  const distAtKm = deltaAt * R;

  if (distAtKm > distAB) {
    // Falls past point B
    return haversineKm(b, p, R);
  }

  return Math.abs(deltaXt) * R;
}

/**
 * Formats a coordinate into clean planetary string notation (e.g. "18.44°N, 77.45°E").
 */
export function formatPlanetocentric(
  lat: number,
  lonE: number,
  decimals: number = 2
): string {
  const cLat = clampLat(lat);
  const normLon = normalizeLon360(lonE);
  const latStr = `${Math.abs(cLat).toFixed(decimals)}°${cLat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${normLon.toFixed(decimals)}°E`;
  return `${latStr}, ${lonStr}`;
}

