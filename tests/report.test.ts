import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { getElevationM, getSlopeDeg, getRoughnessM } from '../src/core/dem';
import { calculateTerrainQuality } from '../src/core/terrain';
import { estimateSurfaceTemperature, MEDA_JEZERO_ANCHOR } from '../src/core/temperature';
import { getLocationReport, resourcesNear, hazardsNear } from '../src/core/report';
import { type Checkpoint } from '../src/core/types';

describe('P5: DEM Topography, Terrain Scoring, Temperature & Location Report', () => {
  const catalogPath = path.resolve(__dirname, '../public/data/checkpoints.json');
  const catalog: Checkpoint[] = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

  describe('DEM Engine (Spec §8.3, §8.4)', () => {
    it('samples Olympus Mons summit elevation close to +21,287 m', () => {
      const res = getElevationM(18.65, 226.2);
      expect(res.value).toBeGreaterThan(20000);
      expect(res.provenance).toBe('NASA-DERIVED');
      expect(res.resolution).toBe('regional_128ppd');
    });

    it('samples Hellas Planitia floor depression below -6,000 m', () => {
      const res = getElevationM(-42.4, 70.5);
      expect(res.value).toBeLessThan(-6000);
      expect(res.provenance).toBe('NASA-DERIVED');
    });

    it('computes realistic slopes and non-zero roughness', () => {
      const slope = getSlopeDeg(18.65, 226.2);
      expect(slope).toBeGreaterThan(0);
      expect(slope).toBeLessThanOrEqual(60);

      const roughness = getRoughnessM(18.65, 226.2);
      expect(roughness).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Terrain Quality Scoring (Spec §8.5)', () => {
    it('calculates deterministic composite penalty and score breakdown', () => {
      const assessment = calculateTerrainQuality({
        slopeDeg: 6.5,
        roughnessM: 120,
        maxHazardSeverityWithin25km: 'low',
        isHighResolution: true,
        slopeLimitDeg: 20.0
      });

      expect(assessment.quality).toBeGreaterThanOrEqual(0);
      expect(assessment.quality).toBeLessThanOrEqual(100);
      expect(assessment.traversable).toBe(true);
      expect(assessment.terms.slopeTerm).toBeCloseTo(6.5 / 20.0, 2);
      expect(assessment.terms.uncertaintyTerm).toBe(0.05);
    });

    it('SCIENTIFIC GUARDRAIL: marks slope exceeding vehicle limit as non-traversable', () => {
      const steepAssessment = calculateTerrainQuality({
        slopeDeg: 22.0,
        roughnessM: 200,
        slopeLimitDeg: 20.0
      });

      expect(steepAssessment.traversable).toBe(false);
      expect(
        steepAssessment.assumptions.some((a) => a.includes('NON-TRAVERSABLE: Slope'))
      ).toBe(true);
    });

    it('SCIENTIFIC GUARDRAIL: marks RSL steep terrain (>27°) as strictly impassable', () => {
      const rslAssessment = calculateTerrainQuality({
        slopeDeg: 29.0,
        roughnessM: 350,
        hasRslNearby: true,
        slopeLimitDeg: 35.0 // even if vehicle limit is high
      });

      expect(rslAssessment.traversable).toBe(false);
      expect(
        rslAssessment.assumptions.some((a) => a.includes('RSL steep granular avalanche'))
      ).toBe(true);
    });
  });

  describe('Surface Temperature Model (Spec §8.6, §17)', () => {
    it('always carries provenance MODELED with ±15 K uncertainty and low confidence', () => {
      const temp = estimateSurfaceTemperature(18.44, -2500, 0, 10);
      expect(temp.provenance).toBe('MODELED');
      expect(temp.uncertaintyK).toBe(15);
      expect(temp.confidence).toBe('low');
      expect(temp.diurnalSwingK).toBe(88);
      expect(temp.disclaimer).toContain('MODELED ENGINEERING ESTIMATE');
    });

    it('attaches measured MEDA anchor when within 500 km of Jezero Crater', () => {
      const nearJezero = estimateSurfaceTemperature(18.44, -2500, 0, 25);
      expect(nearJezero.anchors.length).toBeGreaterThanOrEqual(1);
      expect(nearJezero.anchors[0].provenance).toBe('MEASURED');
      expect(nearJezero.anchors[0].name).toContain('Perseverance MEDA');
    });

    it('includes polar CO2 frost note for high latitudes (>60°)', () => {
      const polar = estimateSurfaceTemperature(75.0, 0, 0, 4000);
      expect(polar.seasonalNote).toBeDefined();
      expect(polar.seasonalNote).toContain('CO2 dry-ice frost');
    });
  });

  describe('Location Report Engine (Spec §8.1, §8.8)', () => {
    it('generates a full validated report for Jezero Crater coordinate', () => {
      const report = getLocationReport({ lat: 18.4447, lonE: 77.4508 }, catalog, {
        radiusKm: 500
      });

      expect(report.query).toBeDefined();
      expect(report.lat).toBeCloseTo(18.4447, 3);
      expect(report.lonE).toBeCloseTo(77.4508, 3);
      expect(report.lonDisplay).toBeCloseTo(77.4508, 3);
      expect(report.nearestFeature?.id).toContain('jezero');
      expect(report.elevationM.provenance).toBe('NASA-DERIVED');
      expect(report.terrain.quality).toBeGreaterThan(0);
      expect(report.temperature.provenance).toBe('MODELED');
      expect(report.resources.items.length).toBeGreaterThan(0);
    });

    it('correctly queries resourcesNear and identifies SWIM ice likelihood zones', () => {
      // Query near Arcadia Planitia (39.3°N, 189.7°E)
      const res = resourcesNear(39.3, 189.7, 500, catalog);
      expect(res.zones.length).toBeGreaterThanOrEqual(1);
      expect(res.zones.some((z) => z.toLowerCase().includes('arcadia'))).toBe(true);

      const iceRes = res.items.filter((item) => item.resourceType === 'water_ice');
      expect(iceRes.length).toBeGreaterThanOrEqual(1);
    });

    it('correctly queries hazardsNear and detects steep slopes / scarps', () => {
      // Near Jezero delta escarpment
      const haz = hazardsNear(18.44, 77.45, 100, catalog);
      expect(haz.length).toBeGreaterThanOrEqual(1);
      expect(
        haz.some((h) => h.label.toLowerCase().includes('delta') || h.label.toLowerCase().includes('escarpment'))
      ).toBe(true);
    });
  });
});
