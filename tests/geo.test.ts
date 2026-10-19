import { describe, it, expect } from 'vitest';
import {
  MARS_RADIUS_KM,
  normalizeLon360,
  lon360ToDisplay,
  displayToLon360,
  clampLat,
  haversineKm,
  formatPlanetocentric,
  initialBearingDeg,
  finalBearingDeg,
  destinationPoint,
  greatCircleArc,
  splitArcAtAntimeridian,
  crossTrackKm,
  pointToSegmentDistanceKm
} from '../src/core/geo';

describe('Planetary Geodesy (src/core/geo.ts)', () => {
  it('normalizes longitudes to 0°–360° correctly across wraps', () => {
    expect(normalizeLon360(0)).toBe(0);
    expect(normalizeLon360(360)).toBe(0);
    expect(normalizeLon360(720)).toBe(0);
    expect(normalizeLon360(-90)).toBe(270);
    expect(normalizeLon360(-180)).toBe(180);
    expect(normalizeLon360(370)).toBe(10);
  });

  it('converts East-positive 360° longitude to display -180°..180°', () => {
    expect(lon360ToDisplay(0)).toBe(0);
    expect(lon360ToDisplay(180)).toBe(180);
    expect(lon360ToDisplay(181)).toBe(-179);
    // Olympus Mons: 226.2°E -> -133.8°
    expect(lon360ToDisplay(226.2)).toBeCloseTo(-133.8, 4);
    // Gale Crater: 137.44°E -> 137.44°
    expect(lon360ToDisplay(137.44)).toBeCloseTo(137.44, 4);
  });

  it('converts display longitude back to East-positive 360°', () => {
    expect(displayToLon360(-133.8)).toBeCloseTo(226.2, 4);
    expect(displayToLon360(137.44)).toBeCloseTo(137.44, 4);
    expect(displayToLon360(0)).toBe(0);
  });

  it('clamps latitudes to [-90, 90]', () => {
    expect(clampLat(-100)).toBe(-90);
    expect(clampLat(100)).toBe(90);
    expect(clampLat(18.44)).toBe(18.44);
  });

  it('computes accurate great-circle distances via haversine', () => {
    // Identical point = 0 km
    expect(haversineKm(18.44, 77.45, 18.44, 77.45)).toBe(0);

    // Quarter of Martian equator (90 degrees along equator)
    // Distance = (PI / 2) * R = (PI / 2) * 3389.5 ≈ 5324.23 km
    const quarterEquator = haversineKm(0, 0, 0, 90);
    expect(quarterEquator).toBeCloseTo(5324.23, 1);

    // Pole to pole = PI * R ≈ 10648.45 km
    const poleToPole = haversineKm(90, 0, -90, 0);
    expect(poleToPole).toBeCloseTo(Math.PI * MARS_RADIUS_KM, 1);
  });

  it('formats planetocentric coordinates cleanly', () => {
    expect(formatPlanetocentric(18.4447, 77.4508)).toBe('18.44°N, 77.45°E');
    expect(formatPlanetocentric(-4.59, 137.44)).toBe('4.59°S, 137.44°E');
  });

  it('computes exact 1° equatorial distance matching analytical 2*pi*R/360', () => {
    const analyticalOneDegKm = (2 * Math.PI * MARS_RADIUS_KM) / 360; // ~59.159 km
    const measuredOneDegKm = haversineKm({ lat: 0, lonE: 0 }, { lat: 0, lonE: 1 });
    expect(measuredOneDegKm).toBeCloseTo(analyticalOneDegKm, 3);
  });

  it('calculates initial and final bearings with 0°–360° wrapping', () => {
    // Due North
    expect(initialBearingDeg({ lat: 0, lonE: 0 }, { lat: 10, lonE: 0 })).toBeCloseTo(0, 3);
    // Due East
    expect(initialBearingDeg({ lat: 0, lonE: 0 }, { lat: 0, lonE: 10 })).toBeCloseTo(90, 3);
    // Due South
    expect(initialBearingDeg({ lat: 10, lonE: 0 }, { lat: 0, lonE: 0 })).toBeCloseTo(180, 3);
    // Due West
    expect(initialBearingDeg({ lat: 0, lonE: 10 }, { lat: 0, lonE: 0 })).toBeCloseTo(270, 3);
    // Wrapping across 0°/360° boundary: 355°E to 5°E is due East (90°)
    expect(initialBearingDeg({ lat: 0, lonE: 355 }, { lat: 0, lonE: 5 })).toBeCloseTo(90, 3);
    // 5°E to 355°E is due West (270°)
    expect(initialBearingDeg({ lat: 0, lonE: 5 }, { lat: 0, lonE: 355 })).toBeCloseTo(270, 3);
  });

  it('calculates destinationPoint accurately along cardinal directions', () => {
    const oneDegKm = (2 * Math.PI * MARS_RADIUS_KM) / 360;
    // 1° North from (0, 0)
    const northDest = destinationPoint({ lat: 0, lonE: 0 }, 0, oneDegKm);
    expect(northDest.lat).toBeCloseTo(1.0, 3);
    expect(northDest.lonE).toBeCloseTo(0.0, 3);

    // 1° East from (0, 0)
    const eastDest = destinationPoint({ lat: 0, lonE: 0 }, 90, oneDegKm);
    expect(eastDest.lat).toBeCloseTo(0.0, 3);
    expect(eastDest.lonE).toBeCloseTo(1.0, 3);
  });

  it('generates spherical great-circle arc with slerp', () => {
    const a = { lat: 0, lonE: 0 };
    const b = { lat: 0, lonE: 10 };
    const arc = greatCircleArc(a, b, 20, 200);

    expect(arc.length).toBeGreaterThanOrEqual(2);
    expect(arc[0].lat).toBeCloseTo(0, 3);
    expect(arc[0].lonE).toBeCloseTo(0, 3);
    expect(arc[arc.length - 1].lat).toBeCloseTo(0, 3);
    expect(arc[arc.length - 1].lonE).toBeCloseTo(10, 3);

    // Midpoint along equator should be at ~5°E
    const mid = arc[Math.floor(arc.length / 2)];
    expect(mid.lat).toBeCloseTo(0, 1);
    expect(mid.lonE).toBeCloseTo(5, 1);
  });

  it('splits great-circle arc at antimeridian (display lon ±180°)', () => {
    // 170°E to 190°E crosses 180° (display lon jumps from 170° to -170°)
    const a = { lat: 10, lonE: 170 };
    const b = { lat: 10, lonE: 190 };
    const arc = greatCircleArc(a, b, 10, 50);
    const split = splitArcAtAntimeridian(arc);

    expect(split.length).toBe(2);
    // First segment ends at 180°E
    expect(split[0][split[0].length - 1].lonE).toBeCloseTo(180, 1);
    // Second segment starts at 180°E
    expect(split[1][0].lonE).toBeCloseTo(180, 1);
  });

  it('computes perpendicular cross-track distance on a known right angle', () => {
    const a = { lat: 0, lonE: 0 };
    const b = { lat: 0, lonE: 10 }; // Along equator
    const p = { lat: 1, lonE: 5 }; // 1° North of equator track

    const oneDegKm = (2 * Math.PI * MARS_RADIUS_KM) / 360;
    const xt = crossTrackKm(p, a, b);
    expect(xt).toBeCloseTo(oneDegKm, 2);
  });

  it('handles poles correctly without NaN or singularity errors', () => {
    const northPole = { lat: 90, lonE: 0 };
    const southPole = { lat: -90, lonE: 180 };
    const dist = haversineKm(northPole, southPole);
    expect(dist).toBeCloseTo(Math.PI * MARS_RADIUS_KM, 1);

    const arc = greatCircleArc(northPole, southPole, 100, 50);
    expect(arc.length).toBeGreaterThan(2);
    arc.forEach((pt) => {
      expect(Number.isFinite(pt.lat)).toBe(true);
      expect(Number.isFinite(pt.lonE)).toBe(true);
    });
  });
});

