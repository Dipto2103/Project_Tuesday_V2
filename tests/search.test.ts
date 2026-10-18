import { describe, it, expect } from 'vitest';
import { parseCoordinateInput, searchLocations } from '../src/core/search';
import type { Checkpoint } from '../src/core/types';

describe('Search & Coordinate Parsing (src/core/search.ts)', () => {
  it('parses standard hemisphere notation (18.44N 77.45E)', () => {
    const res = parseCoordinateInput('18.44N 77.45E');
    expect(res).not.toBeNull();
    expect(res?.lat).toBe(18.44);
    expect(res?.lonE).toBe(77.45);
    expect(res?.displayLon).toBe(77.45);
  });

  it('parses decimal degree pair with negative coordinates (-4.59, 137.44)', () => {
    const res = parseCoordinateInput('-4.59, 137.44');
    expect(res).not.toBeNull();
    expect(res?.lat).toBe(-4.59);
    expect(res?.lonE).toBe(137.44);
  });

  it('parses display longitude notation with negative longitude (18.65, -133.8)', () => {
    // 18.65°N, -133.8° display -> 226.2°E (Olympus Mons summit)
    const res = parseCoordinateInput('18.65, -133.8');
    expect(res).not.toBeNull();
    expect(res?.lat).toBe(18.65);
    expect(res?.lonE).toBeCloseTo(226.2, 4);
    expect(res?.displayLon).toBeCloseTo(-133.8, 4);
  });

  it('converts West longitude to East-positive (18.44°N 282.55°W)', () => {
    // 282.55°W -> 360 - 282.55 = 77.45°E
    const res = parseCoordinateInput('18.44°N 282.55°W');
    expect(res).not.toBeNull();
    expect(res?.lat).toBe(18.44);
    expect(res?.lonE).toBeCloseTo(77.45, 2);
  });

  it('gracefully returns null on garbage inputs', () => {
    expect(parseCoordinateInput('')).toBeNull();
    expect(parseCoordinateInput('hello world')).toBeNull();
    expect(parseCoordinateInput('12345')).toBeNull();
    expect(parseCoordinateInput('95.0, 50.0')).toBeNull(); // Latitude > 90
  });

  it('searches catalog checkpoints by name and resource type', () => {
    const sampleCatalog: Checkpoint[] = [
      {
        id: 'jezero-perseverance',
        name: 'Jezero Crater',
        kind: 'landing_site',
        lat: 18.44,
        lonE: 77.45,
        coordConfidence: 'exact',
        coordSource: 'nasa-page',
        resources: [{ type: 'clay_minerals', detail: 'Delta clays', provenance: 'MEASURED' }],
        summary: 'Perseverance landing site in Jezero delta.',
        sources: [{ title: 'NASA', url: 'https://mars.nasa.gov' }]
      },
      {
        id: 'arcadia-ice',
        name: 'Arcadia Planitia Ice Zone',
        kind: 'resource_zone',
        lat: 39.2,
        lonE: 189.7,
        coordConfidence: 'region',
        coordSource: 'nasa-page',
        resources: [{ type: 'water_ice', detail: 'Shallow ice within 1-2m', provenance: 'NASA-DERIVED' }],
        summary: 'SWIM shallow water ice zone.',
        sources: [{ title: 'SWIM', url: 'https://swim.psi.edu' }]
      }
    ];

    // Search by name
    const jezeroHits = searchLocations('jezero', sampleCatalog);
    expect(jezeroHits.length).toBeGreaterThan(0);
    expect(jezeroHits[0].checkpointId).toBe('jezero-perseverance');

    // Search by resource
    const iceHits = searchLocations('ice', sampleCatalog);
    expect(iceHits.length).toBeGreaterThan(0);
    expect(iceHits[0].checkpointId).toBe('arcadia-ice');

    // Search by coordinates parses coordinate directly
    const coordHits = searchLocations('18.44, 77.45', sampleCatalog);
    expect(coordHits.length).toBeGreaterThan(0);
    expect(coordHits[0].type).toBe('coordinate');
    expect(coordHits[0].lat).toBe(18.44);
  });
});
