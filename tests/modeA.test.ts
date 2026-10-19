import { describe, it, expect } from 'vitest';
import { planModeA } from '../src/core/route/modeA';
import {
  RouteRequestSchema,
  RouteResultSchema,
  RouteErrorSchema,
  type RouteRequest
} from '../src/core/route/types';
import { haversineKm } from '../src/core/geo';

describe('Mode A Direct Great-Circle Route Planning (Spec §8.1–§8.2)', () => {
  const defaultRequest: RouteRequest = {
    mode: 'A_DIRECT',
    from: { lat: 18.44, lonE: 77.45 }, // Jezero
    to: { lat: -4.59, lonE: 137.44 },   // Gale
    vehicle: 'eva',
    assumptions: {
      slope_limit_eva_deg: 15.0,
      speed_eva_kmh: 0.8
    }
  };

  it('computes distance equal to spherical haversine distance with detourRatio = 1.0', () => {
    const result = planModeA(defaultRequest);

    const expectedDist = haversineKm(defaultRequest.from, defaultRequest.to);
    expect(result.distanceKm).toBeCloseTo(expectedDist, 1);
    expect(result.straightLineKm).toBeCloseTo(expectedDist, 1);
    expect(result.detourRatio).toBe(1.0);
    expect(result.timeHours).toBeNull();
    expect(result.confidence).toBe('UNVERIFIED');
    expect(result.geometry.length).toBeGreaterThanOrEqual(2);
  });

  it('MANDATORY WARNING: always contains direct path unverified warning', () => {
    const result = planModeA(defaultRequest);

    expect(result.warnings).toContain('Direct path. Not checked for terrain safety.');
  });

  it('MANDATORY WARNING: flags steep terrain when sampled slope exceeds vehicle limit', () => {
    // Custom mock sampler simulating steep slope of 22° (> 15° EVA limit)
    const steepSampler = () => ({
      elevationM: -2500,
      slopeDeg: 22.0,
      hasData: true,
      resolution: 'regional_128ppd'
    });

    const result = planModeA(defaultRequest, steepSampler);

    expect(result.warnings.some((w) => w.includes('steeper than the limit for eva'))).toBe(true);
    expect(result.passesSlopeLimit).toBe(false);
    expect(result.segments.some((s) => s.flag === 'STEEP')).toBe(true);
  });

  it('MANDATORY WARNING: flags no-data when terrain gap is encountered', () => {
    const gapSampler = () => ({
      elevationM: null,
      slopeDeg: null,
      hasData: false
    });

    const result = planModeA(defaultRequest, gapSampler);

    expect(result.warnings).toContain('This line crosses areas with no terrain data.');
    expect(result.passesSlopeLimit).toBe('UNKNOWN');
    expect(result.segments.every((s) => s.flag === 'NO_DATA')).toBe(true);
  });

  it('validates Zod runtime schema round-trip for RouteRequest and RouteResult', () => {
    // 1. Validate request
    const parsedReq = RouteRequestSchema.parse(defaultRequest);
    expect(parsedReq.vehicle).toBe('eva');

    // 2. Compute and validate result
    const result = planModeA(defaultRequest);
    const parsedResult = RouteResultSchema.parse(result);

    expect(parsedResult.ok).toBe(true);
    expect(parsedResult.mode).toBe('A_DIRECT');
    expect(parsedResult.detourRatio).toBe(1.0);
    expect(parsedResult.confidence).toBe('UNVERIFIED');
  });

  it('validates Zod runtime schema for RouteError', () => {
    const errorPayload = {
      mode: 'B_TERRAIN_ASTAR',
      ok: false,
      error: 'NO_ROUTE',
      reason: 'Start location is surrounded by impassable cliffs.'
    };

    const parsedErr = RouteErrorSchema.parse(errorPayload);
    expect(parsedErr.ok).toBe(false);
    expect(parsedErr.error).toBe('NO_ROUTE');
  });
});
