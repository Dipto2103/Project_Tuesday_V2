import { describe, it, expect } from 'vitest';
import {
  CheckpointSchema,
  ProvenanceSchema,
  ResourceTypeSchema,
  LocationReportSchema,
  MissionPlanSchema
} from '../src/core/types';

describe('Zod Data Models & Validation (src/core/types.ts)', () => {
  it('validates allowed provenance values strictly', () => {
    expect(ProvenanceSchema.parse('MEASURED')).toBe('MEASURED');
    expect(ProvenanceSchema.parse('NASA-DERIVED')).toBe('NASA-DERIVED');
    expect(ProvenanceSchema.parse('MODELED')).toBe('MODELED');
    expect(ProvenanceSchema.parse('SIMULATED')).toBe('SIMULATED');
    expect(ProvenanceSchema.parse('UNKNOWN')).toBe('UNKNOWN');
    expect(() => ProvenanceSchema.parse('GUESS')).toThrow();
  });

  it('validates full checkpoint records', () => {
    const validCheckpoint = {
      id: 'jezero-perseverance',
      name: 'Jezero Crater (Octavia E. Butler Landing)',
      kind: 'landing_site',
      lat: 18.4447,
      lonE: 77.4508,
      coordConfidence: 'exact',
      coordSource: 'nasa-page',
      resources: [
        {
          type: 'clay_minerals',
          detail: 'Fe/Mg smectite clays in river delta fan deposits',
          provenance: 'MEASURED'
        }
      ],
      summary: 'Perseverance rover operational landing site exploring ancient lacustrine environment.',
      sources: [
        {
          title: 'NASA Mars 2020 Mission Landing Site',
          url: 'https://mars.nasa.gov/mars2020/mission/science/landing-site/'
        }
      ]
    };

    const parsed = CheckpointSchema.parse(validCheckpoint);
    expect(parsed.id).toBe('jezero-perseverance');
    expect(parsed.resources[0].type).toBe('clay_minerals');
  });

  it('rejects checkpoint with out-of-range coordinates or invalid URL', () => {
    expect(() =>
      CheckpointSchema.parse({
        id: 'bad-cp',
        name: 'Bad Coord',
        kind: 'landmark',
        lat: 95.0, // Invalid latitude
        lonE: 77.0,
        coordConfidence: 'exact',
        coordSource: 'nasa-page',
        summary: 'Invalid',
        sources: []
      })
    ).toThrow();

    expect(() =>
      CheckpointSchema.parse({
        id: 'bad-url',
        name: 'Bad URL',
        kind: 'landmark',
        lat: 10.0,
        lonE: 77.0,
        coordConfidence: 'exact',
        coordSource: 'nasa-page',
        summary: 'Invalid',
        sources: [{ title: 'Bad', url: 'not-a-url' }]
      })
    ).toThrow();
  });
});
