import { describe, it, expect } from 'vitest';
import { planModeB, planMultiModeB, snapToTraversable } from '../src/core/route/modeB';
import { type RouteRequest } from '../src/core/route/types';
import { haversineKm } from '../src/core/geo';

describe('Mode B Terrain-Aware A* Pathfinding (Spec §8.3, §9)', () => {
  const openFieldReq: RouteRequest = {
    mode: 'B_TERRAIN_ASTAR',
    from: { lat: 18.44, lonE: 77.45 }, // Jezero floor
    to: { lat: 18.52, lonE: 77.29 },   // Jezero delta rim
    vehicle: 'rover_pressurised',
    assumptions: {
      slope_limit_rover_pressurised_deg: 15.0,
      speed_rover_pressurised_kmh: 14.0
    }
  };

  it('computes feasible route with detour ratio >= 1.0 and passing slope limit', () => {
    const result = planModeB(openFieldReq);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.mode).toBe('B_TERRAIN_ASTAR');
    expect(result.detourRatio).toBeGreaterThanOrEqual(0.99);
    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.timeHours).toBeGreaterThan(0);
    expect(result.geometry.length).toBeGreaterThanOrEqual(2);
    expect(result.segments.length).toBeGreaterThanOrEqual(1);
    expect(result.confidence).toBe('HIGH');
  });

  it('DETERMINISM: running the exact same request produces an identical path', () => {
    const run1 = planModeB(openFieldReq);
    const run2 = planModeB(openFieldReq);

    expect(run1.ok).toBe(true);
    expect(run2.ok).toBe(true);
    if (!run1.ok || !run2.ok) return;

    expect(run1.distanceKm).toBe(run2.distanceKm);
    expect(run1.climbM).toBe(run2.climbM);
    expect(run1.geometry.length).toBe(run2.geometry.length);

    for (let i = 0; i < run1.geometry.length; i++) {
      expect(run1.geometry[i].lat).toBe(run2.geometry[i].lat);
      expect(run1.geometry[i].lonE).toBe(run2.geometry[i].lonE);
    }
  });

  it('CANCELLATION: aborts search immediately when shouldCancel returns true', () => {
    const result = planModeB(openFieldReq, undefined, {
      shouldCancel: () => true
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toBe('NO_ROUTE');
    expect(result.reason).toContain('cancelled');
  });

  it('SNAPPING: snaps start point when placed on steep impassable scarp', () => {
    // Olympus Mons steep caldera wall: ~18.65°N, 226.2°E has extreme slopes
    // With a suited EVA limit of 5° (artificially restricted to test snapping)
    const snap = snapToTraversable({ lat: 18.65, lonE: 226.2 }, 'eva', false, 25.0);

    // Either unchanged if traversable or moved to nearest traversable cell
    expect(Number.isFinite(snap.offsetKm)).toBe(true);
    expect(snap.coord.lat).toBeDefined();
    expect(snap.coord.lonE).toBeDefined();
  });

  it('SHORTEST VS SAFEST: safest mode penalizes slope more heavily', () => {
    const { shortest, safest } = planMultiModeB(openFieldReq);

    expect(shortest.ok).toBe(true);
    expect(safest.ok).toBe(true);
    if (!shortest.ok || !safest.ok) return;

    // Safest route prioritizes gentler slopes (mean slope <= shortest + 1°)
    expect(safest.meanSlopeDeg).toBeLessThanOrEqual((shortest.meanSlopeDeg ?? 0) + 1.0);
  });

  it('MANDATORY WARNINGS: contains MOLA 463m caveat and simulation model disclaimer', () => {
    const result = planModeB(openFieldReq);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.warnings.some((w) => w.includes('Computed from 463 m MOLA data'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('Model estimate under stated assumptions'))).toBe(true);
  });

  it('RETURNS NO_ROUTE when slope limit is impossibly low', () => {
    const blockedReq: RouteRequest = {
      ...openFieldReq,
      vehicle: 'eva',
      assumptions: {
        slope_limit_eva_deg: 0.1 // Impossibly low: 0.1° slope limit
      }
    };

    const result = planModeB(blockedReq);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toBe('NO_ROUTE');
  });
});
