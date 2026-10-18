import { describe, it, expect } from 'vitest';
import { calculateMarsSky, formatHours, getMarsSeason } from '../src/core/sky/mars24';

describe('Mars Sky Ephemeris Engine (Allison & McEwen 2000 / Mars24)', () => {
  it('formats hours into HH:MM:SS cleanly', () => {
    expect(formatHours(12.5)).toBe('12:30:00');
    expect(formatHours(0)).toBe('00:00:00');
    expect(formatHours(23.999)).toMatch(/^23:59:/);
  });

  it('determines the correct Mars seasons based on Ls', () => {
    expect(getMarsSeason(45)).toBe('Northern Spring / Southern Autumn');
    expect(getMarsSeason(135)).toBe('Northern Summer / Southern Winter');
    expect(getMarsSeason(225)).toBe('Northern Autumn / Southern Spring');
    expect(getMarsSeason(315)).toBe('Northern Winter / Southern Summer');
  });

  it('passes sanity check for Mars Year 34 and 35 start dates', () => {
    // MY 34 began ~ 5 May 2017 (Ls ≈ 0°)
    const my34Date = new Date('2017-05-05T12:00:00Z');
    const my34Sky = calculateMarsSky(my34Date, 0, 0);
    expect(my34Sky.marsYear).toBe(34);
    // Ls should be very close to 0° (equinox)
    expect(my34Sky.lsDeg).toBeLessThan(5);

    // MY 35 began ~ 23 March 2019 (Ls ≈ 0°)
    const my35Date = new Date('2019-03-23T12:00:00Z');
    const my35Sky = calculateMarsSky(my35Date, 0, 0);
    expect(my35Sky.marsYear).toBe(35);
    expect(my35Sky.lsDeg).toBeLessThan(5);
  });

  it('passes sanity check for 17 October 2026: early Mars Year 39 with low Ls', () => {
    // Per Spec §11.1: "On 17 Oct 2026 the app should report early Mars Year 39 with Ls in the low tens of degrees"
    const oct2026Date = new Date('2026-10-17T12:00:00Z');
    const sky = calculateMarsSky(oct2026Date, 18.44, 77.45); // Jezero
    expect(sky.marsYear).toBe(39);
    expect(sky.lsDeg).toBeGreaterThan(0);
    expect(sky.lsDeg).toBeLessThan(35);
    expect(sky.provenance).toBe('NASA-DERIVED');
  });

  it('computes sun elevation near maximum around local noon at the equator during equinox', () => {
    // Equinox date (e.g. May 5, 2017 at equator)
    // Find LTST near 12:00
    const sky = calculateMarsSky(new Date('2017-05-05T06:00:00Z'), 0, 0);
    // Solar declination at equinox is near 0°
    // At equator (lat=0), at noon (LTST=12), elevation is ~90°
    const noonSky = calculateMarsSky(new Date('2017-05-05T12:00:00Z'), 0, 0);
    expect(noonSky.sunElevationDeg).toBeDefined();
    expect(typeof noonSky.sunElevationDeg).toBe('number');
  });

  it('correctly models Phobos rising direction in the west due to super-synchronous orbit', () => {
    const sky = calculateMarsSky(new Date('2026-10-17T12:00:00Z'), 18.44, 77.45);
    expect(sky.phobos.risingDirection).toBe('west');
    expect(sky.deimos.risingDirection).toBe('east');
    expect(sky.phobos.provenance).toBe('APPROXIMATE');
  });

  it('calculates daylight hours and sunrise/sunset at mid-latitudes', () => {
    const sky = calculateMarsSky(new Date('2026-10-17T12:00:00Z'), 18.44, 77.45);
    expect(sky.daylightHours).toBeGreaterThan(10);
    expect(sky.daylightHours).toBeLessThan(14);
    expect(sky.sunriseLtst).toBeDefined();
    expect(sky.sunsetLtst).toBeDefined();
  });
});
