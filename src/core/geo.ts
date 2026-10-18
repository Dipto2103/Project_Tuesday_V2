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

/**
 * Great-circle distance between two Mars points via the Haversine formula.
 * @param lat1 Latitude of point 1 in degrees (-90 to 90)
 * @param lon1 Longitude of point 1 in degrees (east-positive 0-360 or -180..180)
 * @param lat2 Latitude of point 2 in degrees (-90 to 90)
 * @param lon2 Longitude of point 2 in degrees (east-positive 0-360 or -180..180)
 * @param R Planetary radius in km (default: 3389.5 km)
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  R: number = MARS_RADIUS_KM
): number {
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
export function initialBearingDeg(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const rad = Math.PI / 180;
  const phi1 = clampLat(lat1) * rad;
  const phi2 = clampLat(lat2) * rad;
  const deltaLambda = (lon2 - lon1) * rad;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
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
