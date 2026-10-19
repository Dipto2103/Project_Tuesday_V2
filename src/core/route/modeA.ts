/**
 * MARS LANTERN — Mode A: Direct Distance Route Planning
 * 
 * Computes direct spherical great-circle trajectory between Martian coordinates.
 * Samples along the spherical arc using slerp for true equirectangular geometry,
 * extracts elevation profile from DEM anchors/store, and injects mandatory
 * non-dismissible scientific warnings.
 * 
 * Pure TypeScript — zero DOM, zero React.
 * Reference: MARS_LANTERN_ROUTING_ROVER_SPEC.md §8.2
 */

import {
  haversineKm,
  initialBearingDeg,
  finalBearingDeg,
  greatCircleArc,
  MARS_RADIUS_KM
} from '../geo';
import { getElevationM, getSlopeDeg } from '../dem';
import { getVehicleSlopeLimitDeg } from '../../config/assumptions';
import type {
  RouteRequest,
  RouteResult,
  RouteSegment,
  SegmentFlag
} from './types';

export interface ElevationSamplerResult {
  elevationM: number | null;
  slopeDeg?: number | null;
  hasData: boolean;
  resolution?: string;
}

export type ElevationSampler = (lat: number, lonE: number) => ElevationSamplerResult;

/**
 * Default elevation and slope sampler using MOLA multi-anchor model.
 */
export const defaultDemSampler: ElevationSampler = (lat: number, lonE: number) => {
  const elevRes = getElevationM(lat, lonE);
  const slope = getSlopeDeg(lat, lonE);
  return {
    elevationM: elevRes.value,
    slopeDeg: slope,
    hasData: true,
    resolution: elevRes.resolution
  };
};

/**
 * Computes Mode A Direct Great-Circle route with mandatory warnings.
 */
export function planModeA(
  request: RouteRequest,
  sampler: ElevationSampler = defaultDemSampler
): RouteResult {
  const { from, to, vehicle, assumptions } = request;

  const straightDistKm = haversineKm(from, to, MARS_RADIUS_KM);
  const initBearing = initialBearingDeg(from, to);
  const finBearing = finalBearingDeg(from, to);

  // Sample arc points every ~1 km or 100 points maximum
  const arcPoints = greatCircleArc(from, to, Math.max(1.0, straightDistKm / 100), 120);

  const vehicleSlopeLimit =
    assumptions[`slope_limit_${vehicle}_deg`] ?? getVehicleSlopeLimitDeg(vehicle);

  const segments: RouteSegment[] = [];
  let climbM = 0;
  let descentM = 0;
  let maxSlopeDeg: number | null = null;
  let slopeSum = 0;
  let slopeSampleCount = 0;
  let noDataSegmentCount = 0;
  let highResSegmentLength = 0;

  let hasSteepSegment = false;
  let hasNoDataSample = false;

  let prevElev: number | null = null;

  for (let i = 0; i < arcPoints.length - 1; i++) {
    const ptA = arcPoints[i];
    const ptB = arcPoints[i + 1];
    const segLen = haversineKm(ptA, ptB, MARS_RADIUS_KM);

    // Sample terrain at segment midpoint
    const midLat = (ptA.lat + ptB.lat) / 2;
    const midLonE = (ptA.lonE + ptB.lonE) / 2;
    const sample = sampler(midLat, midLonE);

    let flag: SegmentFlag = 'UNVERIFIED';

    if (!sample.hasData || sample.elevationM === null) {
      flag = 'NO_DATA';
      hasNoDataSample = true;
      noDataSegmentCount++;
    } else {
      if (sample.resolution === 'regional_128ppd') {
        highResSegmentLength += segLen;
      }

      if (prevElev !== null) {
        const deltaElev = sample.elevationM - prevElev;
        if (deltaElev > 0) climbM += deltaElev;
        else descentM += Math.abs(deltaElev);
      }
      prevElev = sample.elevationM;

      if (typeof sample.slopeDeg === 'number') {
        slopeSum += sample.slopeDeg;
        slopeSampleCount++;
        if (maxSlopeDeg === null || sample.slopeDeg > maxSlopeDeg) {
          maxSlopeDeg = sample.slopeDeg;
        }

        if (sample.slopeDeg >= vehicleSlopeLimit) {
          flag = 'STEEP';
          hasSteepSegment = true;
        }
      }
    }

    segments.push({
      a: ptA,
      b: ptB,
      lengthKm: parseFloat(segLen.toFixed(3)),
      slopeDeg: sample.slopeDeg !== undefined ? sample.slopeDeg : null,
      elevationM: sample.elevationM,
      flag
    });
  }

  const meanSlopeDeg =
    slopeSampleCount > 0 ? parseFloat((slopeSum / slopeSampleCount).toFixed(1)) : null;

  // Compute coverage percentages
  const dataCoveragePct =
    straightDistKm > 0
      ? parseFloat(((highResSegmentLength / straightDistKm) * 100).toFixed(1))
      : 0;

  const noDataPct =
    segments.length > 0
      ? parseFloat(((noDataSegmentCount / segments.length) * 100).toFixed(1))
      : 0;

  // Mandatory warnings per Spec §8.2 (Cannot be hidden or dismissed)
  const warnings: string[] = [
    'Direct path. Not checked for terrain safety.'
  ];

  if (hasSteepSegment) {
    warnings.push(`This line crosses terrain steeper than the limit for ${vehicle} (${vehicleSlopeLimit}°).`);
  }

  if (hasNoDataSample || noDataPct > 0) {
    warnings.push('This line crosses areas with no terrain data.');
  }

  let passesSlopeLimit: boolean | 'UNKNOWN' = 'UNKNOWN';
  if (!hasNoDataSample && maxSlopeDeg !== null) {
    passesSlopeLimit = maxSlopeDeg < vehicleSlopeLimit;
  }

  return {
    mode: 'A_DIRECT',
    ok: true,
    geometry: arcPoints,
    segments,
    distanceKm: parseFloat(straightDistKm.toFixed(3)),
    straightLineKm: parseFloat(straightDistKm.toFixed(3)),
    detourRatio: 1.0,
    climbM: Math.round(climbM),
    descentM: Math.round(descentM),
    maxSlopeDeg: maxSlopeDeg !== null ? parseFloat(maxSlopeDeg.toFixed(1)) : null,
    meanSlopeDeg,
    dataCoveragePct,
    noDataPct,
    passesSlopeLimit,
    timeHours: null, // Always null for Mode A
    confidence: 'UNVERIFIED',
    warnings,
    provenance: 'MODELED',
    assumptionsUsed: {
      ...assumptions,
      vehicle,
      vehicleSlopeLimitDeg: vehicleSlopeLimit,
      routingMode: 'A_DIRECT'
    },
    computedAt: new Date().toISOString(),
    initialBearingDeg: parseFloat(initBearing.toFixed(1)),
    finalBearingDeg: parseFloat(finBearing.toFixed(1))
  };
}
