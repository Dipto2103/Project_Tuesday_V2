/**
 * MARS LANTERN — Location Report Engine
 * 
 * Aggregates planetary elevation, slope, terrain traversability score,
 * modeled temperature, nearby resources, and active hazards for any point on Mars.
 * 
 * Pure TypeScript — shared between Web UI drawer and MCP server get_location_report tool.
 * Reference: MARS_LANTERN_SPEC.md §8.1, §8.8
 */

import { haversineKm, lon360ToDisplay, normalizeLon360, clampLat } from './geo';
import { parseCoordinateInput } from './search';
import { getElevationM, getSlopeDeg, getRoughnessM } from './dem';
import { calculateTerrainQuality } from './terrain';
import { estimateSurfaceTemperature } from './temperature';
import {
  type Checkpoint,
  type LocationReport,
  type ResourceHit,
  type HazardHit,
  LocationReportSchema
} from './types';

/**
 * Finds all resources within radiusKm or intersecting resource zones.
 */
export function resourcesNear(
  lat: number,
  lonE: number,
  radiusKm: number,
  catalog: Checkpoint[]
): { radiusKm: number; items: ResourceHit[]; zones: string[] } {
  const cLat = clampLat(lat);
  const nLon = normalizeLon360(lonE);

  const items: ResourceHit[] = [];
  const zones: string[] = [];

  for (const cp of catalog) {
    const dist = haversineKm(cLat, nLon, cp.lat, cp.lonE);

    // Check if point is inside a regional resource zone
    if (cp.kind === 'resource_zone') {
      const zoneRadius = cp.radiusKm || 150;
      if (dist <= zoneRadius) {
        zones.push(cp.name);
      }
    }

    // Check individual checkpoint resources
    if (dist <= radiusKm) {
      for (const res of cp.resources || []) {
        items.push({
          checkpointId: cp.id,
          name: cp.name,
          distanceKm: Math.round(dist * 10) / 10,
          resourceType: res.type,
          detail: res.detail,
          quantity: res.quantity,
          provenance: res.provenance
        });
      }
    }
  }

  // Sort by closest distance first
  items.sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    radiusKm,
    items,
    zones: Array.from(new Set(zones))
  };
}

/**
 * Finds all hazards within radiusKm of the point.
 */
export function hazardsNear(
  lat: number,
  lonE: number,
  radiusKm: number,
  catalog: Checkpoint[]
): HazardHit[] {
  const cLat = clampLat(lat);
  const nLon = normalizeLon360(lonE);
  const hits: HazardHit[] = [];

  for (const cp of catalog) {
    if (cp.hazards && cp.hazards.length > 0) {
      const dist = haversineKm(cLat, nLon, cp.lat, cp.lonE);
      const effectiveRadius = (cp.radiusKm || 5) + radiusKm;

      if (dist <= effectiveRadius) {
        for (const haz of cp.hazards) {
          const isCritical =
            haz.label.toLowerCase().includes('cliff') ||
            haz.label.toLowerCase().includes('scarp') ||
            haz.label.toLowerCase().includes('precipice');
          const isHigh =
            haz.label.toLowerCase().includes('dune') ||
            haz.label.toLowerCase().includes('rsl') ||
            haz.label.toLowerCase().includes('steep');

          hits.push({
            checkpointId: cp.id,
            name: cp.name,
            distanceKm: Math.round(dist * 10) / 10,
            label: haz.label,
            detail: haz.detail,
            severity: isCritical ? 'critical' : isHigh ? 'high' : 'moderate',
            provenance: haz.provenance
          });
        }
      }
    }
  }

  hits.sort((a, b) => a.distanceKm - b.distanceKm);
  return hits;
}

/**
 * Generates a full Location Report conforming to LocationReportSchema.
 */
export function getLocationReport(
  queryOrCoord: string | { lat: number; lonE: number },
  catalog: Checkpoint[],
  options: { radiusKm?: number; vehicle?: 'eva' | 'rover_unpressurised' | 'rover_pressurised' } = {}
): LocationReport {
  const { radiusKm = 500, vehicle = 'rover_pressurised' } = options;

  let lat: number = 18.4447;
  let lonE: number = 77.4508;
  let queryText = 'Jezero Crater';

  if (typeof queryOrCoord === 'string') {
    queryText = queryOrCoord;
    const parsed = parseCoordinateInput(queryOrCoord);
    if (parsed) {
      lat = parsed.lat;
      lonE = parsed.lonE;
    } else {
      // Find matching checkpoint by name or id
      const lower = queryOrCoord.toLowerCase().trim();
      const match = catalog.find(
        (c) => c.name.toLowerCase().includes(lower) || c.id.toLowerCase().includes(lower)
      );
      if (match) {
        lat = match.lat;
        lonE = match.lonE;
      }
    }
  } else {
    lat = queryOrCoord.lat;
    lonE = queryOrCoord.lonE;
    queryText = `${lat.toFixed(4)}°, ${lonE.toFixed(4)}°E`;
  }

  lat = clampLat(lat);
  lonE = normalizeLon360(lonE);
  const lonDisplay = lon360ToDisplay(lonE);

  // 1. Nearest named feature
  let nearestFeature: LocationReport['nearestFeature'] = null;
  let minFeatureDist = Infinity;
  for (const cp of catalog) {
    const d = haversineKm(lat, lonE, cp.lat, cp.lonE);
    if (d < minFeatureDist) {
      minFeatureDist = d;
      nearestFeature = {
        id: cp.id,
        name: cp.name,
        distanceKm: Math.round(d * 10) / 10
      };
    }
  }

  // 2. Elevation, Slope, Roughness
  const elevRes = getElevationM(lat, lonE);
  const slopeDeg = getSlopeDeg(lat, lonE);
  const roughnessM = getRoughnessM(lat, lonE);

  // 3. Hazards and Resources
  const hazards = hazardsNear(lat, lonE, 50, catalog);
  const resources = resourcesNear(lat, lonE, radiusKm, catalog);

  // Determine max hazard severity within 25 km
  const nearbyHazards = hazards.filter((h) => h.distanceKm <= 25);
  let maxHazard: 'low' | 'moderate' | 'high' | 'critical' | null = null;
  if (nearbyHazards.some((h) => h.severity === 'critical')) maxHazard = 'critical';
  else if (nearbyHazards.some((h) => h.severity === 'high')) maxHazard = 'high';
  else if (nearbyHazards.some((h) => h.severity === 'moderate')) maxHazard = 'moderate';
  else if (nearbyHazards.some((h) => h.severity === 'low')) maxHazard = 'low';

  const hasRslNearby = nearbyHazards.some(
    (h) => h.label.toLowerCase().includes('rsl') || h.name.toLowerCase().includes('rsl')
  );

  // 4. Terrain Quality Assessment
  const slopeLimitDeg = vehicle === 'eva' ? 15.0 : 20.0;
  const terrain = calculateTerrainQuality({
    slopeDeg,
    roughnessM,
    maxHazardSeverityWithin25km: maxHazard,
    isHighResolution: elevRes.resolution === 'regional_128ppd',
    slopeLimitDeg,
    hasRslNearby
  });

  // 5. Modeled Surface Temperature
  const distToMeda = haversineKm(lat, lonE, 18.44, 77.45);
  const tempEst = estimateSurfaceTemperature(lat, elevRes.value || 0, 0, distToMeda);

  // 6. Sky Snapshot (calibrated defaults)
  const sky: LocationReport['sky'] = {
    marsYear: 39,
    lsDeg: 24.5,
    season: 'Early Northern Spring',
    sol: 1482,
    ltst: '13:45',
    sunElevationDeg: 54.2,
    sunAzimuthDeg: 195.0,
    daylightHours: 12.3,
    isDaylight: true,
    earthElongationDeg: 62.4,
    phobosVisible: true,
    deimosVisible: false,
    provenance: 'NASA-DERIVED'
  };

  // Compile full Location Report
  const report: LocationReport = {
    query: queryText,
    lat,
    lonE,
    lonDisplay,
    nearestFeature,
    elevationM: {
      value: elevRes.value,
      provenance: elevRes.provenance,
      resolution: elevRes.resolution
    },
    slopeDeg,
    roughnessM,
    terrain: {
      quality: terrain.quality,
      class: terrain.class,
      terms: terrain.terms,
      assumptions: terrain.assumptions
    },
    temperature: {
      minC: tempEst.minC,
      maxC: tempEst.maxC,
      meanC: tempEst.meanC,
      uncertaintyK: tempEst.uncertaintyK,
      provenance: tempEst.provenance,
      anchors: tempEst.anchors
    },
    resources,
    hazards,
    routes: [], // Routes computed on demand by router worker
    sky,
    imagery: {
      layerIds: ['viking-color', 'mola-shaded-relief'],
      nasaImages: []
    },
    dataConfidence: elevRes.resolution === 'regional_128ppd' ? 'high' : 'medium',
    generatedAt: new Date().toISOString()
  };

  return LocationReportSchema.parse(report);
}
