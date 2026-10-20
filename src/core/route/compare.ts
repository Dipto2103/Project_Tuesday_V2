/**
 * MARS LANTERN — Route Proximity Metrics & Multi-Route Comparison Engine
 *
 * Implements Spec §8.5 & §8.6:
 * Pure TypeScript functions computing geodesic cross-track offsets, Hausdorff distances,
 * corridor coverage percentages, and side-by-side comparative matrices.
 */

import { haversineKm, initialBearingDeg, type LatLonE } from '../geo';
import type { RouteResult, VehicleType } from './types';

export interface RouteProximityMetrics {
  meanOffsetKm: number;
  maxOffsetKm: number;
  hausdorffKm: number;
  pctWithin500m: number;
  pctWithin2km: number;
  pctWithin5km: number;
  coverageOfReferencePct: number;
  alongTrackAgreementPct: number;
  sampleCount: number;
}

export interface RouteComparisonRow {
  metric: string;
  label: string;
  values: Record<string, string | number | null>;
  bestMode?: string;
}

export interface RouteComparisonTable {
  routes: {
    mode: string;
    label: string;
    provenance: string;
    confidence: string;
    verdict: 'PASSES SLOPE LIMIT' | 'FAILS' | 'UNKNOWN';
  }[];
  rows: RouteComparisonRow[];
}

/**
 * Resamples a polyline at approximately `stepKm` intervals along great-circle segments
 */
export function resamplePolyline(points: LatLonE[], stepKm: number = 0.5): LatLonE[] {
  if (points.length <= 1) return points;
  const resampled: LatLonE[] = [points[0]];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const segDist = haversineKm(p1, p2);
    if (segDist <= stepKm) {
      resampled.push(p2);
      continue;
    }

    const steps = Math.ceil(segDist / stepKm);
    for (let s = 1; s <= steps; s++) {
      const frac = s / steps;
      // Linear lat/lon interpolation along small step
      resampled.push({
        lat: p1.lat + frac * (p2.lat - p1.lat),
        lonE: p1.lonE + frac * (p2.lonE - p1.lonE)
      });
    }
  }

  return resampled;
}

/**
 * Computes shortest distance from point P to polyline T
 */
function minDistanceToPolyline(p: LatLonE, poly: LatLonE[]): { distKm: number; nearestIdx: number } {
  let minDist = Infinity;
  let nearestIdx = 0;

  for (let i = 0; i < poly.length; i++) {
    const d = haversineKm(p, poly[i]);
    if (d < minDist) {
      minDist = d;
      nearestIdx = i;
    }
  }

  return { distKm: minDist, nearestIdx };
}

/**
 * Computes comprehensive proximity metrics between a planned route P and a reference traverse T (Spec §8.5)
 */
export function computeProximityMetrics(
  planned: LatLonE[],
  reference: LatLonE[],
  stepKm: number = 0.2
): RouteProximityMetrics {
  if (planned.length === 0 || reference.length === 0) {
    return {
      meanOffsetKm: 0,
      maxOffsetKm: 0,
      hausdorffKm: 0,
      pctWithin500m: 0,
      pctWithin2km: 0,
      pctWithin5km: 0,
      coverageOfReferencePct: 0,
      alongTrackAgreementPct: 0,
      sampleCount: 0
    };
  }

  // Resample both polylines for accurate uniform distance distribution
  const pSamples = resamplePolyline(planned, stepKm);
  const tSamples = resamplePolyline(reference, stepKm);

  // 1. Offsets from P to T
  let sumOffset = 0;
  let maxOffsetPT = 0;
  let count500m = 0;
  let count2km = 0;
  let count5km = 0;
  let directionalAgreementCount = 0;

  for (let i = 0; i < pSamples.length; i++) {
    const pt = pSamples[i];
    const { distKm, nearestIdx } = minDistanceToPolyline(pt, tSamples);

    sumOffset += distKm;
    if (distKm > maxOffsetPT) maxOffsetPT = distKm;
    if (distKm <= 0.5) count500m++;
    if (distKm <= 2.0) count2km++;
    if (distKm <= 5.0) count5km++;

    // Directional agreement
    if (i < pSamples.length - 1 && nearestIdx < tSamples.length - 1) {
      const bP = initialBearingDeg(pt, pSamples[i + 1]);
      const bT = initialBearingDeg(tSamples[nearestIdx], tSamples[nearestIdx + 1]);
      let diff = Math.abs(bP - bT);
      if (diff > 180) diff = 360 - diff;
      if (diff <= 45) {
        directionalAgreementCount++;
      }
    }
  }

  const meanOffsetKm = pSamples.length > 0 ? sumOffset / pSamples.length : 0;
  const pctWithin500m = (count500m / pSamples.length) * 100;
  const pctWithin2km = (count2km / pSamples.length) * 100;
  const pctWithin5km = (count5km / pSamples.length) * 100;
  const alongTrackAgreementPct =
    pSamples.length > 1 ? (directionalAgreementCount / (pSamples.length - 1)) * 100 : 100;

  // 2. Offsets from T to P (for coverage and symmetric Hausdorff)
  let maxOffsetTP = 0;
  let tCoveredCount = 0;

  for (let i = 0; i < tSamples.length; i++) {
    const { distKm } = minDistanceToPolyline(tSamples[i], pSamples);
    if (distKm > maxOffsetTP) maxOffsetTP = distKm;
    if (distKm <= 2.0) tCoveredCount++;
  }

  const coverageOfReferencePct = (tCoveredCount / tSamples.length) * 100;
  const hausdorffKm = Math.max(maxOffsetPT, maxOffsetTP);

  return {
    meanOffsetKm: Number(meanOffsetKm.toFixed(3)),
    maxOffsetKm: Number(maxOffsetPT.toFixed(3)),
    hausdorffKm: Number(hausdorffKm.toFixed(3)),
    pctWithin500m: Number(pctWithin500m.toFixed(1)),
    pctWithin2km: Number(pctWithin2km.toFixed(1)),
    pctWithin5km: Number(pctWithin5km.toFixed(1)),
    coverageOfReferencePct: Number(coverageOfReferencePct.toFixed(1)),
    alongTrackAgreementPct: Number(alongTrackAgreementPct.toFixed(1)),
    sampleCount: pSamples.length
  };
}

/**
 * Builds a side-by-side comparative table across computed RouteResults (Spec §8.6)
 */
export function compareRoutes(
  routes: RouteResult[],
  vehicle: VehicleType = 'eva'
): RouteComparisonTable {
  const slopeLimit = vehicle === 'eva' ? 15 : 20;

  const getModeKey = (r: RouteResult, idx: number) => {
    const prefix = r.mode.startsWith('A') ? 'A' : r.mode.startsWith('B') ? 'B' : 'C';
    return `${prefix}_${idx}`;
  };

  const routeHeaders = routes.map((r, idx) => {
    let label = 'Route';
    if (r.mode === 'A' || r.mode === 'A_DIRECT') {
      label = 'Mode A (Direct)';
    } else if (r.mode === 'B' || r.mode === 'B_SHORTEST' || r.mode === 'B_SAFEST') {
      label = r.warnings.some(w => w.toLowerCase().includes('safest'))
        ? 'Mode B (Safest)'
        : 'Mode B (Shortest)';
    } else if (r.mode === 'C') {
      label = 'Mode C (Rover Ref.)';
    }

    let verdict: 'PASSES SLOPE LIMIT' | 'FAILS' | 'UNKNOWN' = 'PASSES SLOPE LIMIT';
    if (r.passesSlopeLimit === false || (r.maxSlopeDeg !== null && r.maxSlopeDeg > slopeLimit)) {
      verdict = 'FAILS';
    } else if (r.passesSlopeLimit === 'UNKNOWN' || r.confidence === 'UNVERIFIED') {
      verdict = 'UNKNOWN';
    }

    return {
      mode: getModeKey(r, idx),
      label,
      provenance: r.provenance,
      confidence: r.confidence,
      verdict
    };
  });

  const getVals = (getter: (r: RouteResult) => string | number | null) => {
    const map: Record<string, string | number | null> = {};
    routes.forEach((r, idx) => {
      map[getModeKey(r, idx)] = getter(r);
    });
    return map;
  };

  // Find lowest for comparable numerical metrics
  const findBest = (getter: (r: RouteResult) => number | null, lowerIsBetter = true) => {
    let bestKey: string | undefined = undefined;
    let bestVal = lowerIsBetter ? Infinity : -Infinity;

    routes.forEach((r, idx) => {
      const v = getter(r);
      if (v !== null && !isNaN(v)) {
        if (lowerIsBetter && v < bestVal) {
          bestVal = v;
          bestKey = getModeKey(r, idx);
        } else if (!lowerIsBetter && v > bestVal) {
          bestVal = v;
          bestKey = getModeKey(r, idx);
        }
      }
    });

    return bestKey;
  };

  const rows: RouteComparisonRow[] = [
    {
      metric: 'distance',
      label: 'Total Distance',
      values: getVals(r => `${r.distanceKm.toFixed(2)} km`),
      bestMode: findBest(r => r.distanceKm, true)
    },
    {
      metric: 'detour',
      label: 'Detour Ratio',
      values: getVals(r => `${r.detourRatio.toFixed(2)}×`),
      bestMode: findBest(r => r.detourRatio, true)
    },
    {
      metric: 'time',
      label: 'Estimated Duration',
      values: getVals(r => (r.timeHours !== null ? `${r.timeHours.toFixed(1)} hrs` : 'N/A (Geometric)')),
      bestMode: findBest(r => r.timeHours, true)
    },
    {
      metric: 'maxSlope',
      label: 'Maximum Slope',
      values: getVals(r => (r.maxSlopeDeg !== null && r.maxSlopeDeg !== undefined ? `${r.maxSlopeDeg.toFixed(1)}°` : 'N/A')),
      bestMode: findBest(r => r.maxSlopeDeg, true)
    },
    {
      metric: 'meanSlope',
      label: 'Mean Slope',
      values: getVals(r => (r.meanSlopeDeg !== null && r.meanSlopeDeg !== undefined ? `${r.meanSlopeDeg.toFixed(1)}°` : 'N/A')),
      bestMode: findBest(r => r.meanSlopeDeg, true)
    },
    {
      metric: 'climb',
      label: 'Elevation Gain (Climb)',
      values: getVals(r => `${(r.climbM ?? (r as any).climbMeters ?? 0).toFixed(0)} m`),
      bestMode: findBest(r => r.climbM ?? (r as any).climbMeters ?? null, true)
    },
    {
      metric: 'noDataPct',
      label: 'Data Gap Coverage',
      values: getVals(r => `${r.noDataPct.toFixed(1)}% gaps`),
      bestMode: findBest(r => r.noDataPct, true)
    },
    {
      metric: 'warningsCount',
      label: 'Safety Warnings',
      values: getVals(r => `${r.warnings.length} advisory flags`),
      bestMode: findBest(r => r.warnings.length, true)
    }
  ];

  return {
    routes: routeHeaders,
    rows
  };
}
