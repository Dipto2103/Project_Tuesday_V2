import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { TrackPoints } from '../src/core/rovers/types';
import {
  positionAtSol,
  segmentBetweenSols,
  drivesPerSol,
  stats,
  nearestApproach,
  slopeEnvelope,
  ROVER_SLOPE_CAPTION
} from '../src/core/rovers/traverse';
import { planModeC } from '../src/core/route/modeC';
import { computeProximityMetrics, compareRoutes } from '../src/core/route/compare';
import { planModeA } from '../src/core/route/modeA';
import type { RouteRequest } from '../src/core/route/types';

describe('Phase R7 — Rover Analytics, Mode C & Proximity Metrics', () => {
  // Load real Curiosity track points generated in R6
  const cPointsPath = path.resolve(process.cwd(), 'public/data/tracks/curiosity.points.json');
  const cTrack: TrackPoints = JSON.parse(fs.readFileSync(cPointsPath, 'utf-8'));

  describe('Rover Analytics (§11)', () => {
    it('interpolates positionAtSol correctly and handles clamping', () => {
      // 1. Clamping before start
      const early = positionAtSol(cTrack, 0);
      expect(early.clamped).toBe(true);
      expect(early.sol).toBe(cTrack.sol[0]);

      // 2. Exact sol match
      const exactSol = cTrack.sol[10];
      const exactPos = positionAtSol(cTrack, exactSol);
      expect(exactPos.clamped).toBe(false);
      expect(exactPos.point.lat).toBeCloseTo(cTrack.lat[10], 4);
      expect(exactPos.point.lonE).toBeCloseTo(cTrack.lonE[10], 4);

      // 3. Clamping after end
      const late = positionAtSol(cTrack, 99999);
      expect(late.clamped).toBe(true);
      expect(late.sol).toBe(cTrack.sol[cTrack.sol.length - 1]);
    });

    it('extracts segmentBetweenSols with distance, climb, and mean drive', () => {
      const seg = segmentBetweenSols(cTrack, 100, 300);
      expect(seg.points.length).toBeGreaterThan(0);
      expect(seg.distanceKm).toBeGreaterThan(0);
      expect(seg.solCount).toBe(201);
      expect(seg.meanDailyDriveKm).toBeGreaterThan(0);
      expect(seg.climbM).toBeGreaterThanOrEqual(0);
    });

    it('computes drivesPerSol identifying zero-drive resting sols', () => {
      const drives = drivesPerSol(cTrack);
      expect(drives.length).toBeGreaterThan(500);

      const restingSols = drives.filter(d => !d.hasDrive);
      const activeSols = drives.filter(d => d.hasDrive);
      expect(restingSols.length).toBeGreaterThan(10);
      expect(activeSols.length).toBeGreaterThan(10);
    });

    it('computes traverse stats with monotonic odometry and elevation range', () => {
      const s = stats(cTrack);
      expect(s.totalOdometryKm).toBeGreaterThan(30);
      expect(s.pointCount).toBe(cTrack.sol.length);
      expect(s.maxElevationM).toBeDefined();
      expect(s.minElevationM).toBeDefined();
      if (s.maxElevationM !== null && s.minElevationM !== null) {
        expect(s.maxElevationM).toBeGreaterThan(s.minElevationM);
      }
    });

    it('finds nearest approach to a target coordinate', () => {
      // Target right next to Bradbury landing
      const bradbury = { lat: -4.5895, lonE: 137.4417 };
      const approach = nearestApproach(cTrack, bradbury);
      expect(approach.minDistanceKm).toBeLessThan(0.2);
      expect(approach.sol).toBeLessThanOrEqual(20);
    });

    it('computes slope envelope with mandatory scientific caveat caption', () => {
      const env = slopeEnvelope(cTrack);
      expect(env.p50).toBeGreaterThanOrEqual(0);
      expect(env.p90).toBeGreaterThanOrEqual(env.p50);
      expect(env.max).toBeGreaterThanOrEqual(env.p90);
      expect(env.fixedCaption).toBe(ROVER_SLOPE_CAPTION);
      expect(env.fixedCaption).toContain('does not set a human safety limit');
    });
  });

  describe('Mode C — Historical Rover Reference (§8.4)', () => {
    it('produces a reference route between waypoints near Curiosity traverse with mandatory warnings', () => {
      const req: RouteRequest = {
        from: { lat: -4.5895, lonE: 137.4417 }, // Near Bradbury Landing
        to: { lat: -4.6850, lonE: 137.3750 },   // Near Garden City
        vehicle: 'eva',
        mode: 'C',
        assumptions: {}
      };

      const result = planModeC(req, cTrack, 'Curiosity');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.mode).toBe('C');
        expect(result.provenance).toBe('NASA-DERIVED');
        expect(result.distanceKm).toBeGreaterThan(0);
        expect(result.geometry.length).toBeGreaterThan(10);

        // Verify mandatory warnings
        const warningText = result.warnings.join(' ');
        expect(warningText).toContain('Robotic traverse');
        expect(warningText).toContain('does not mean a human on foot or in a suit can walk it');
        expect(warningText).toContain('Rover tracks reflect the science plan');
      }
    });

    it('returns NO_REFERENCE_TRAVERSE when endpoints exceed snap radius (> 5 km)', () => {
      const req: RouteRequest = {
        from: { lat: 10.0, lonE: 137.4417 }, // ~800 km away from Gale Crater!
        to: { lat: 11.0, lonE: 137.4417 },
        vehicle: 'eva',
        mode: 'C',
        assumptions: {}
      };

      const result = planModeC(req, cTrack, 'Curiosity', undefined, 5.0);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('NO_REFERENCE_TRAVERSE');
        expect(result.reason).toContain('exceeds 5 km snap radius');
      }
    });
  });

  describe('Route Proximity Metrics & Comparison (§8.5, §8.6)', () => {
    it('evaluates identical polylines with zero offsets and 100% agreement', () => {
      const sampleLine = [
        { lat: -4.58, lonE: 137.40 },
        { lat: -4.60, lonE: 137.42 },
        { lat: -4.62, lonE: 137.44 }
      ];

      const metrics = computeProximityMetrics(sampleLine, sampleLine);
      expect(metrics.meanOffsetKm).toBeCloseTo(0, 2);
      expect(metrics.maxOffsetKm).toBeCloseTo(0, 2);
      expect(metrics.hausdorffKm).toBeCloseTo(0, 2);
      expect(metrics.pctWithin500m).toBe(100);
      expect(metrics.coverageOfReferencePct).toBe(100);
      expect(metrics.alongTrackAgreementPct).toBe(100);
    });

    it('evaluates parallel offset route accurately (~1 km offset)', () => {
      // 1 km East at equator on Mars is ~1 / 59.17 ≈ 0.0169 degrees longitude
      const dLon = 1.0 / 59.17;
      const baseLine = [
        { lat: 0.0, lonE: 100.0 },
        { lat: 0.1, lonE: 100.0 },
        { lat: 0.2, lonE: 100.0 }
      ];
      const offsetLine = baseLine.map(p => ({ lat: p.lat, lonE: p.lonE + dLon }));

      const metrics = computeProximityMetrics(offsetLine, baseLine);
      expect(metrics.meanOffsetKm).toBeCloseTo(1.0, 1);
      expect(metrics.pctWithin500m).toBe(0);
      expect(metrics.pctWithin2km).toBe(100);
    });

    it('evaluates disjoint routes with near-zero corridor overlap', () => {
      const lineA = [{ lat: 0.0, lonE: 0.0 }, { lat: 0.1, lonE: 0.0 }];
      const lineB = [{ lat: 50.0, lonE: 50.0 }, { lat: 50.1, lonE: 50.0 }];

      const metrics = computeProximityMetrics(lineA, lineB);
      expect(metrics.meanOffsetKm).toBeGreaterThan(1000);
      expect(metrics.pctWithin5km).toBe(0);
      expect(metrics.coverageOfReferencePct).toBe(0);
    });

    it('generates a multi-route comparison table across Modes A and C', () => {
      const req: RouteRequest = {
        from: { lat: -4.5895, lonE: 137.4417 },
        to: { lat: -4.6850, lonE: 137.3750 },
        vehicle: 'eva',
        mode: 'A',
        assumptions: {}
      };

      const resA = planModeA(req);
      const resC = planModeC(req, cTrack, 'Curiosity');

      expect(resA.ok).toBe(true);
      expect(resC.ok).toBe(true);

      if (resA.ok && resC.ok) {
        const table = compareRoutes([resA, resC], 'eva');
        expect(table.routes.length).toBe(2);
        expect(table.rows.length).toBeGreaterThanOrEqual(6);

        // Distance row
        const distRow = table.rows.find(r => r.metric === 'distance');
        expect(distRow).toBeDefined();

        // Mode A distance should be best (lowest)
        expect(distRow?.bestMode).toBe('A_0');
      }
    });
  });
});
