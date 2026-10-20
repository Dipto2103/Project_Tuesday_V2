/**
 * MARS LANTERN — Historical Rover Traverse Analytics Engine
 *
 * Implements Spec §11:
 * Pure TypeScript functions evaluating rover motion telemetry, sol interpolation,
 * odometry envelopes, and slope distribution profiles.
 */

import { haversineKm, type LatLonE } from '../geo';
import type { TrackPoints } from './types';
import type { DemStore } from '../dem/demStore';

export interface SolPositionResult {
  point: LatLonE;
  elevationM: number | null;
  odomKm: number;
  clamped: boolean;
  sol: number;
}

export interface TrackSegmentResult {
  points: LatLonE[];
  distanceKm: number;
  climbM: number;
  meanDailyDriveKm: number;
  solCount: number;
  solStart: number;
  solEnd: number;
}

export interface DrivePerSol {
  sol: number;
  driveKm: number;
  cumulativeKm: number;
  hasDrive: boolean;
}

export interface TraverseStats {
  totalOdometryKm: number;
  totalSols: number;
  solRange: [number, number];
  maxSolDriveKm: number;
  meanSolDriveKm: number;
  maxElevationM: number | null;
  minElevationM: number | null;
  elevationGainM: number;
  pointCount: number;
}

export interface NearestApproachResult {
  minDistanceKm: number;
  sol: number;
  alongTrackKm: number;
  index: number;
  nearestPoint: LatLonE;
}

export interface SlopeEnvelopeResult {
  p50: number;
  p90: number;
  p99: number;
  max: number;
  sampleCount: number;
  fixedCaption: string;
}

export const ROVER_SLOPE_CAPTION =
  'Robotic vehicles have driven up to this slope at this data resolution. This does not set a human safety limit.';

/**
 * Returns interpolated LatLonE and elevation at a given sol.
 * Clamps outside the sol range with a flag.
 */
export function positionAtSol(track: TrackPoints, targetSol: number): SolPositionResult {
  const n = track.sol.length;
  if (n === 0) {
    return {
      point: { lat: 0, lonE: 0 },
      elevationM: null,
      odomKm: 0,
      clamped: true,
      sol: targetSol
    };
  }

  // Clamping before start
  if (targetSol <= track.sol[0]) {
    return {
      point: { lat: track.lat[0], lonE: track.lonE[0] },
      elevationM: track.elevM[0],
      odomKm: track.odomKm[0],
      clamped: targetSol < track.sol[0],
      sol: track.sol[0]
    };
  }

  // Clamping after end
  if (targetSol >= track.sol[n - 1]) {
    return {
      point: { lat: track.lat[n - 1], lonE: track.lonE[n - 1] },
      elevationM: track.elevM[n - 1],
      odomKm: track.odomKm[n - 1],
      clamped: targetSol > track.sol[n - 1],
      sol: track.sol[n - 1]
    };
  }

  // Binary search for surrounding sol bracket
  let low = 0;
  let high = n - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (track.sol[mid] === targetSol) {
      return {
        point: { lat: track.lat[mid], lonE: track.lonE[mid] },
        elevationM: track.elevM[mid],
        odomKm: track.odomKm[mid],
        clamped: false,
        sol: targetSol
      };
    }
    if (track.sol[mid] < targetSol) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const i0 = high;
  const i1 = low;
  const s0 = track.sol[i0];
  const s1 = track.sol[i1];
  const t = s1 === s0 ? 0 : (targetSol - s0) / (s1 - s0);

  // Linear interpolation along coordinates and odometry
  const lat = track.lat[i0] + t * (track.lat[i1] - track.lat[i0]);
  const lonE = track.lonE[i0] + t * (track.lonE[i1] - track.lonE[i0]);
  const odomKm = track.odomKm[i0] + t * (track.odomKm[i1] - track.odomKm[i0]);

  let elevationM: number | null = null;
  const e0 = track.elevM[i0];
  const e1 = track.elevM[i1];
  if (e0 !== null && e1 !== null) {
    elevationM = e0 + t * (e1 - e0);
  } else {
    elevationM = e0 ?? e1;
  }

  return {
    point: { lat: Number(lat.toFixed(6)), lonE: Number(lonE.toFixed(6)) },
    elevationM: elevationM !== null ? Number(elevationM.toFixed(1)) : null,
    odomKm: Number(odomKm.toFixed(3)),
    clamped: false,
    sol: targetSol
  };
}

/**
 * Extracts sub-track between two sols, computing distance, climb, and mean daily drive
 */
export function segmentBetweenSols(track: TrackPoints, s1: number, s2: number): TrackSegmentResult {
  const startSol = Math.min(s1, s2);
  const endSol = Math.max(s1, s2);
  const points: LatLonE[] = [];

  let distKm = 0;
  let climbM = 0;
  let firstIdx = -1;
  let lastIdx = -1;

  for (let i = 0; i < track.sol.length; i++) {
    const sol = track.sol[i];
    if (sol >= startSol && sol <= endSol) {
      if (firstIdx === -1) firstIdx = i;
      lastIdx = i;
      points.push({ lat: track.lat[i], lonE: track.lonE[i] });

      if (points.length > 1) {
        const prevIdx = i - 1;
        const ePrev = track.elevM[prevIdx];
        const eCurr = track.elevM[i];
        if (ePrev !== null && eCurr !== null && eCurr > ePrev) {
          climbM += eCurr - ePrev;
        }
      }
    }
  }

  if (firstIdx !== -1 && lastIdx !== -1 && lastIdx >= firstIdx) {
    distKm = track.odomKm[lastIdx] - track.odomKm[firstIdx];
  }

  const solCount = Math.max(1, endSol - startSol + 1);
  const meanDailyDriveKm = distKm / solCount;

  return {
    points,
    distanceKm: Number(distKm.toFixed(3)),
    climbM: Number(climbM.toFixed(1)),
    meanDailyDriveKm: Number(meanDailyDriveKm.toFixed(4)),
    solCount,
    solStart: startSol,
    solEnd: endSol
  };
}

/**
 * Generates an array of daily drives per sol for plotting and telemetry
 */
export function drivesPerSol(track: TrackPoints): DrivePerSol[] {
  const result: DrivePerSol[] = [];
  const n = track.sol.length;
  if (n === 0) return result;

  const solMap = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const sol = track.sol[i];
    const prevOdom = i > 0 ? track.odomKm[i - 1] : 0;
    const delta = Math.max(0, track.odomKm[i] - prevOdom);
    solMap.set(sol, (solMap.get(sol) || 0) + delta);
  }

  const minSol = track.sol[0];
  const maxSol = track.sol[n - 1];
  let cumOdom = 0;

  for (let s = minSol; s <= maxSol; s++) {
    const driveKm = solMap.get(s) || 0;
    cumOdom += driveKm;
    result.push({
      sol: s,
      driveKm: Number(driveKm.toFixed(4)),
      cumulativeKm: Number(cumOdom.toFixed(3)),
      hasDrive: driveKm > 0.001
    });
  }

  return result;
}

/**
 * Computes high-level summary statistics for a track
 */
export function stats(track: TrackPoints): TraverseStats {
  const n = track.sol.length;
  if (n === 0) {
    return {
      totalOdometryKm: 0,
      totalSols: 0,
      solRange: [0, 0],
      maxSolDriveKm: 0,
      meanSolDriveKm: 0,
      maxElevationM: null,
      minElevationM: null,
      elevationGainM: 0,
      pointCount: 0
    };
  }

  const totalOdom = track.odomKm[n - 1] - track.odomKm[0];
  const solRange: [number, number] = [track.sol[0], track.sol[n - 1]];
  const totalSols = Math.max(1, solRange[1] - solRange[0] + 1);

  let maxSolDrive = 0;
  let elevationGain = 0;
  let maxElev: number | null = null;
  let minElev: number | null = null;

  for (let i = 0; i < n; i++) {
    const elev = track.elevM[i];
    if (elev !== null) {
      if (maxElev === null || elev > maxElev) maxElev = elev;
      if (minElev === null || elev < minElev) minElev = elev;
    }

    if (i > 0) {
      const stepOdom = track.odomKm[i] - track.odomKm[i - 1];
      if (stepOdom > maxSolDrive) maxSolDrive = stepOdom;

      const prevElev = track.elevM[i - 1];
      if (elev !== null && prevElev !== null && elev > prevElev) {
        elevationGain += elev - prevElev;
      }
    }
  }

  return {
    totalOdometryKm: Number(totalOdom.toFixed(3)),
    totalSols,
    solRange,
    maxSolDriveKm: Number(maxSolDrive.toFixed(3)),
    meanSolDriveKm: Number((totalOdom / totalSols).toFixed(4)),
    maxElevationM: maxElev !== null ? Number(maxElev.toFixed(1)) : null,
    minElevationM: minElev !== null ? Number(minElev.toFixed(1)) : null,
    elevationGainM: Number(elevationGain.toFixed(1)),
    pointCount: n
  };
}

/**
 * Finds the point of nearest approach along the rover track to a given coordinate
 */
export function nearestApproach(track: TrackPoints, target: LatLonE): NearestApproachResult {
  let minDistanceKm = Infinity;
  let nearestIdx = 0;

  for (let i = 0; i < track.lat.length; i++) {
    const d = haversineKm(target, { lat: track.lat[i], lonE: track.lonE[i] });
    if (d < minDistanceKm) {
      minDistanceKm = d;
      nearestIdx = i;
    }
  }

  return {
    minDistanceKm: Number(minDistanceKm.toFixed(3)),
    sol: track.sol[nearestIdx],
    alongTrackKm: track.odomKm[nearestIdx],
    index: nearestIdx,
    nearestPoint: { lat: track.lat[nearestIdx], lonE: track.lonE[nearestIdx] }
  };
}

/**
 * Samples slope along the rover track using DemStore if provided, or elevation diffs
 */
export function slopeAlongTrack(
  track: TrackPoints,
  demStore?: DemStore
): { sol: number; slopeDeg: number | null; provenance: 'NASA-DERIVED location, MODELED slope' }[] {
  const result: { sol: number; slopeDeg: number | null; provenance: 'NASA-DERIVED location, MODELED slope' }[] = [];

  for (let i = 0; i < track.lat.length; i++) {
    const pt: LatLonE = { lat: track.lat[i], lonE: track.lonE[i] };
    let slopeDeg: number | null = null;

    if (demStore) {
      const terrain = demStore.getTerrainAt(pt);
      slopeDeg = terrain.slopeDeg;
    } else if (i > 0) {
      // Fallback: gradient between consecutive points
      const prevPt: LatLonE = { lat: track.lat[i - 1], lonE: track.lonE[i - 1] };
      const distM = haversineKm(prevPt, pt) * 1000;
      const e0 = track.elevM[i - 1];
      const e1 = track.elevM[i];
      if (distM > 1 && e0 !== null && e1 !== null) {
        const dElev = Math.abs(e1 - e0);
        slopeDeg = (Math.atan(dElev / distM) * 180) / Math.PI;
      }
    }

    result.push({
      sol: track.sol[i],
      slopeDeg: slopeDeg !== null ? Number(slopeDeg.toFixed(2)) : null,
      provenance: 'NASA-DERIVED location, MODELED slope'
    });
  }

  return result;
}

/**
 * Computes slope envelope (p50, p90, p99, max) that the rover traversed
 */
export function slopeEnvelope(track: TrackPoints, demStore?: DemStore): SlopeEnvelopeResult {
  const samples = slopeAlongTrack(track, demStore)
    .map(s => s.slopeDeg)
    .filter((s): s is number => s !== null && !isNaN(s))
    .sort((a, b) => a - b);

  if (samples.length === 0) {
    return {
      p50: 0,
      p90: 0,
      p99: 0,
      max: 0,
      sampleCount: 0,
      fixedCaption: ROVER_SLOPE_CAPTION
    };
  }

  const getPercentile = (p: number) => {
    const idx = Math.min(samples.length - 1, Math.floor((p / 100) * samples.length));
    return samples[idx];
  };

  return {
    p50: Number(getPercentile(50).toFixed(2)),
    p90: Number(getPercentile(90).toFixed(2)),
    p99: Number(getPercentile(99).toFixed(2)),
    max: Number(samples[samples.length - 1].toFixed(2)),
    sampleCount: samples.length,
    fixedCaption: ROVER_SLOPE_CAPTION
  };
}
