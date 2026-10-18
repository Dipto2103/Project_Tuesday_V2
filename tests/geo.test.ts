import { describe, it, expect } from 'vitest';
import {
  MARS_RADIUS_KM,
  normalizeLon360,
  lon360ToDisplay,
  displayToLon360,
  clampLat,
  haversineKm,
  formatPlanetocentric
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
});
