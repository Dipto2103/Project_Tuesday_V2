import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CheckpointSchema, type Checkpoint } from '../src/core/types';

describe('Checkpoint Catalog & Scientific Guardrails (Spec §6.1, §6.2, §17)', () => {
  const catalogPath = path.resolve(__dirname, '../public/data/checkpoints.json');

  it('loads public/data/checkpoints.json and confirms at least 40 entries', () => {
    expect(fs.existsSync(catalogPath)).toBe(true);
    const raw = fs.readFileSync(catalogPath, 'utf-8');
    const checkpoints: Checkpoint[] = JSON.parse(raw);

    expect(Array.isArray(checkpoints)).toBe(true);
    expect(checkpoints.length).toBeGreaterThanOrEqual(40);
  });

  it('validates every checkpoint against CheckpointSchema', () => {
    const raw = fs.readFileSync(catalogPath, 'utf-8');
    const checkpoints: Checkpoint[] = JSON.parse(raw);

    for (const cp of checkpoints) {
      const validated = CheckpointSchema.parse(cp);
      expect(validated.lat).toBeGreaterThanOrEqual(-90);
      expect(validated.lat).toBeLessThanOrEqual(90);
      expect(validated.lonE).toBeGreaterThanOrEqual(0);
      expect(validated.lonE).toBeLessThanOrEqual(360);

      // Check provenance on every resource and hazard
      for (const res of validated.resources) {
        expect(['MEASURED', 'NASA-DERIVED', 'MODELED', 'SIMULATED', 'UNKNOWN']).toContain(
          res.provenance
        );
      }
      for (const haz of validated.hazards || []) {
        expect(['MEASURED', 'NASA-DERIVED', 'MODELED', 'SIMULATED', 'UNKNOWN']).toContain(
          haz.provenance
        );
      }
    }
  });

  it('SCIENTIFIC GUARDRAIL: verifies RSL are NEVER classified as a water resource', () => {
    const raw = fs.readFileSync(catalogPath, 'utf-8');
    const checkpoints: Checkpoint[] = JSON.parse(raw);

    const rslSites = checkpoints.filter(
      (cp) =>
        cp.name.includes('RSL') ||
        cp.name.includes('Recurring Slope Lineae') ||
        cp.id.includes('rsl')
    );

    expect(rslSites.length).toBeGreaterThanOrEqual(2);

    for (const site of rslSites) {
      expect(site.kind).toBe('hazard');

      // Crucial: Must NEVER contain water_ice resource!
      const hasWaterResource = site.resources.some((r) => r.type === 'water_ice');
      expect(hasWaterResource).toBe(false);

      // Hazard description must note dry/granular flows on steep slopes
      const rslHazard = site.hazards?.find((h) => h.label.includes('RSL'));
      expect(rslHazard).toBeDefined();
      expect(rslHazard?.detail.toLowerCase()).toContain('granular');
    }
  });

  it('verifies Phoenix Green Valley is recorded as a MEASURED water ice anchor', () => {
    const raw = fs.readFileSync(catalogPath, 'utf-8');
    const checkpoints: Checkpoint[] = JSON.parse(raw);

    const phoenix = checkpoints.find((cp) => cp.id === 'phoenix-green-valley');
    expect(phoenix).toBeDefined();
    expect(phoenix?.lat).toBeCloseTo(68.22, 1);
    expect(phoenix?.lonE).toBeCloseTo(234.25, 1);

    const waterIce = phoenix?.resources.find((r) => r.type === 'water_ice');
    expect(waterIce).toBeDefined();
    expect(waterIce?.provenance).toBe('MEASURED');
  });

  it('verifies SWIM zones are tagged as NASA-DERIVED likelihood zones', () => {
    const raw = fs.readFileSync(catalogPath, 'utf-8');
    const checkpoints: Checkpoint[] = JSON.parse(raw);

    const swimZones = checkpoints.filter((cp) => cp.id.startsWith('swim-'));
    expect(swimZones.length).toBeGreaterThanOrEqual(3);

    for (const zone of swimZones) {
      expect(zone.kind).toBe('resource_zone');
      expect(zone.coordConfidence).toBe('region');
      const iceRes = zone.resources.find((r) => r.type === 'water_ice');
      expect(iceRes?.provenance).toBe('NASA-DERIVED');
    }
  });
});
