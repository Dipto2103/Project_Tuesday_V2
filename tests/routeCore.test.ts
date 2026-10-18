import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { planMarsRoute } from '../src/core/route';
import { type Checkpoint } from '../src/core/types';

describe('P6: Routing Engine & Scientific Guardrails (Spec §9.4)', () => {
  const catalogPath = path.resolve(__dirname, '../public/data/checkpoints.json');
  const catalog: Checkpoint[] = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

  it('computes a feasible terrain-aware route between Jezero sites', () => {
    // Jezero western delta rim to crater floor
    const result = planMarsRoute({
      start: { lat: 18.52, lonE: 77.29 },
      destination: { lat: 18.44, lonE: 77.45 },
      vehicle: 'rover_pressurised',
      maxSlopeDeg: 25.0,
      walkingSpeedKmh: 14.0,
      catalog
    });

    expect(result.success).toBe(true);
    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.durationHours).toBeGreaterThan(0);
    expect(result.route?.waypoints.length).toBeGreaterThanOrEqual(2);
    expect(result.maxSlopeDeg).toBeLessThanOrEqual(25.0);
  });

  it('SCIENTIFIC GUARDRAIL: blocked by excessive slope -> returns NO_ROUTE', () => {
    // Set an unrealistically low slope limit (e.g. 0.5 degrees) over complex terrain
    const result = planMarsRoute({
      start: { lat: 18.65, lonE: 226.2 }, // Olympus summit
      destination: { lat: 18.2, lonE: 225.5 }, // Olympus base (extreme scarp)
      vehicle: 'eva',
      maxSlopeDeg: 0.5, // Impossibly low
      walkingSpeedKmh: 0.8,
      catalog
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('NO_ROUTE');
    expect(result.error).toContain('slope limit');
  });

  it('generates direct spherical baseline when requested', () => {
    const result = planMarsRoute({
      start: { lat: 18.44, lonE: 77.45 },
      destination: { lat: -4.59, lonE: 137.44 },
      mode: 'direct',
      walkingSpeedKmh: 10.0
    });

    expect(result.success).toBe(true);
    expect(result.route?.method).toBe('direct');
    expect(result.isLowConfidence).toBe(true);
    expect(result.distanceKm).toBeGreaterThan(1000);
  });

  it('generates alternative safest route with higher caution weights', () => {
    const shortest = planMarsRoute({
      start: { lat: 18.52, lonE: 77.29 },
      destination: { lat: 18.44, lonE: 77.45 },
      mode: 'shortest',
      maxSlopeDeg: 25.0,
      catalog
    });

    const safest = planMarsRoute({
      start: { lat: 18.52, lonE: 77.29 },
      destination: { lat: 18.44, lonE: 77.45 },
      mode: 'safest',
      maxSlopeDeg: 25.0,
      catalog
    });

    expect(shortest.success).toBe(true);
    expect(safest.success).toBe(true);
    // Safest route avoids slopes even if distance is slightly longer or equal
    expect(safest.averageSlopeDeg).toBeLessThanOrEqual(shortest.averageSlopeDeg + 1.0);
  });
});
