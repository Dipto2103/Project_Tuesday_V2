import { describe, it, expect } from 'vitest';
import {
  lon360ToDisplay,
  displayToLon360,
  haversineKm,
  formatPlanetocentric
} from '../src/core/geo';
import { parseCoordinateInput } from '../src/core/search';

/**
 * Coordinate Calibration Gate (MARS_LANTERN_SPEC.md §3.4)
 * 
 * Verifies that the primary calibration anchors:
 * 1. Olympus Mons summit ≈ 18.65°N, 226.2°E (display lon = -133.8°)
 * 2. Jezero Crater ≈ 18.44°N, 77.45°E (display lon = 77.45°)
 * 3. Gale Crater (Bradbury Landing) ≈ 4.59°S, 137.44°E (display lon = 137.44°)
 * 
 * maintain exact geodetic alignment within 0.001° error margin.
 */
describe('Coordinate Calibration Gate (Spec §3.4)', () => {
  it('calibrates Olympus Mons summit (18.65°N, 226.2°E)', () => {
    const lonE = 226.2;
    const lat = 18.65;
    const displayLon = lon360ToDisplay(lonE);

    // Must match display lon = -133.8°
    expect(displayLon).toBeCloseTo(-133.8, 4);

    // Round trip back to 226.2°E
    expect(displayToLon360(displayLon)).toBeCloseTo(lonE, 4);

    // Formatted planetocentric representation
    expect(formatPlanetocentric(lat, lonE)).toBe('18.65°N, 226.20°E');

    // Parse user input strings
    const parsedHemi = parseCoordinateInput('18.65N, 226.2E');
    expect(parsedHemi?.lat).toBe(18.65);
    expect(parsedHemi?.lonE).toBe(226.2);
    expect(parsedHemi?.displayLon).toBeCloseTo(-133.8, 4);

    // West longitude notation: 360 - 133.8 = 226.2
    const parsedWest = parseCoordinateInput('18.65°N, 133.8°W');
    expect(parsedWest?.lonE).toBeCloseTo(226.2, 4);
    expect(parsedWest?.displayLon).toBeCloseTo(-133.8, 4);
  });

  it('calibrates Jezero Crater (18.44°N, 77.45°E)', () => {
    const lonE = 77.45;
    const lat = 18.44;
    const displayLon = lon360ToDisplay(lonE);

    expect(displayLon).toBeCloseTo(77.45, 4);
    expect(displayToLon360(displayLon)).toBeCloseTo(lonE, 4);
    expect(formatPlanetocentric(lat, lonE)).toBe('18.44°N, 77.45°E');

    const parsed = parseCoordinateInput('18.44, 77.45');
    expect(parsed?.lat).toBe(18.44);
    expect(parsed?.lonE).toBe(77.45);
  });

  it('calibrates Gale Crater / Bradbury Landing (4.59°S, 137.44°E)', () => {
    const lonE = 137.44;
    const lat = -4.59;
    const displayLon = lon360ToDisplay(lonE);

    expect(displayLon).toBeCloseTo(137.44, 4);
    expect(displayToLon360(displayLon)).toBeCloseTo(lonE, 4);
    expect(formatPlanetocentric(lat, lonE)).toBe('4.59°S, 137.44°E');

    const parsedHemi = parseCoordinateInput('4.59S, 137.44E');
    expect(parsedHemi?.lat).toBe(-4.59);
    expect(parsedHemi?.lonE).toBe(137.44);

    const parsedDec = parseCoordinateInput('-4.59, 137.44');
    expect(parsedDec?.lat).toBe(-4.59);
    expect(parsedDec?.lonE).toBe(137.44);
  });

  it('verifies inter-site ground truth distances', () => {
    // Distance from Jezero to Gale Crater
    // Jezero: (18.44, 77.45), Gale: (-4.59, 137.44)
    const distJezeroGale = haversineKm(18.44, 77.45, -4.59, 137.44);
    // Verified ground truth is ~3750-3800 km
    expect(distJezeroGale).toBeGreaterThan(3700);
    expect(distJezeroGale).toBeLessThan(3850);
  });
});
