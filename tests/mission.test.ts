import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { validateStopObjective, MISSION_OBJECTIVES } from '../src/core/mission/objectives';
import { evaluateMissionPlan, type MissionInputConfig } from '../src/core/mission/evaluation';
import { encodeMissionToHash, decodeMissionFromHash } from '../src/core/mission/share';
import { type Checkpoint } from '../src/core/types';

describe('P7: Mission Builder & Feasibility Evaluation (Spec §9)', () => {
  const catalogPath = path.resolve(__dirname, '../public/data/checkpoints.json');
  const catalog: Checkpoint[] = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

  describe('Objective & Resource Validation (Spec §9.1)', () => {
    it('validates water-ice sample objective when located at Phoenix Green Valley', () => {
      const res = validateStopObjective(
        'water_ice_sample',
        { lat: 68.22, lonE: 234.25, checkpointId: 'phoenix-green-valley' },
        catalog
      );

      expect(res.valid).toBe(true);
      expect(res.warning).toBeUndefined();
    });

    it('warns when water-ice objective is placed at Gusev basalt plains and recommends ice sites', () => {
      const res = validateStopObjective(
        'water_ice_sample',
        { lat: -14.57, lonE: 175.48, checkpointId: 'gusev-plains' },
        catalog
      );

      expect(res.valid).toBe(false);
      expect(res.warning).toBeDefined();
      expect(res.warning?.toLowerCase()).toContain('lacks water ice');
      expect(res.nearestValidCheckpoints?.length).toBeGreaterThan(0);
    });
  });

  describe('Consumable Budget & Feasibility Evaluator (Spec §9.3)', () => {
    it('calculates deterministic O2, water, and food requirements with reserve margin', () => {
      const config: MissionInputConfig = {
        id: 'test-mission-1',
        name: 'Jezero Delta Recon',
        start: { lat: 18.4447, lonE: 77.4508, label: 'Jezero Base' },
        stops: [
          {
            checkpointId: 'jezero-kodiak-mesa',
            lat: 18.397,
            lonE: 77.412,
            label: 'Kodiak Mesa',
            objectives: ['mineral_survey']
          }
        ],
        vehicle: 'rover_pressurised',
        crew: 2,
        durationSols: 3,
        reservePct: 20
      };

      const result = evaluateMissionPlan(config, catalog);

      // Raw O2 = 0.84 * 2 * 3 = 5.04 kg; +20% reserve = 6.048 ≈ 6.0 kg
      expect(result.budget.o2RequiredKg).toBeCloseTo(6.0, 1);
      expect(result.budget.foodRequiredKg).toBeGreaterThan(0);
      expect(result.budget.provenance).toBe('SIMULATED ASSUMPTION');

      // Four separate verdicts
      expect(result.feasibility.resourceVerdict).toBeDefined();
      expect(result.feasibility.terrainVerdict).toBeDefined();
      expect(result.feasibility.scheduleVerdict).toBeDefined();
      expect(result.feasibility.dataCoverageVerdict).toBeDefined();
      expect(['FEASIBLE UNDER ASSUMPTIONS', 'FEASIBLE WITH WARNINGS']).toContain(
        result.feasibility.overall
      );
    });

    it('flags INFEASIBLE when payload exceeds vehicle capacity', () => {
      // 6 astronauts on suited foot EVA carrying heavy drilling equipment
      const overloadConfig: MissionInputConfig = {
        id: 'overload-eva',
        name: 'Overloaded Foot EVA',
        start: { lat: 18.44, lonE: 77.45, label: 'Base' },
        stops: [
          {
            lat: 18.39,
            lonE: 77.41,
            label: 'Far Point',
            objectives: ['deploy_sensor', 'habitat_install', 'water_ice_sample']
          }
        ],
        vehicle: 'eva', // max 45 kg/person -> 270 kg total
        crew: 6,
        durationSols: 10, // huge consumables
        reservePct: 20
      };

      const result = evaluateMissionPlan(overloadConfig, catalog);

      expect(result.feasibility.overall).toBe('INFEASIBLE');
      expect(result.feasibility.reasons.some((r) => r.includes('Payload Overload'))).toBe(true);
    });
  });

  describe('URL-Hash State Sharing & Export (Spec §9.1, §9.7)', () => {
    it('roundtrips a mission configuration through URL-hash serialization', () => {
      const config: MissionInputConfig = {
        id: 'share-test',
        name: 'Arcadia Exploration Traverse',
        start: { lat: 39.3, lonE: 189.7, label: 'Arcadia Base' },
        stops: [
          {
            checkpointId: 'swim-arcadia-planitia',
            lat: 39.5,
            lonE: 190.0,
            label: 'SWIM Core Site',
            objectives: ['water_ice_sample']
          }
        ],
        vehicle: 'rover_unpressurised',
        crew: 3,
        durationSols: 5,
        reservePct: 25
      };

      const hash = encodeMissionToHash(config);
      expect(hash.startsWith('#mission=')).toBe(true);

      const decoded = decodeMissionFromHash(hash);
      expect(decoded?.name).toBe(config.name);
      expect(decoded?.vehicle).toBe(config.vehicle);
      expect(decoded?.crew).toBe(config.crew);
      expect(decoded?.durationSols).toBe(config.durationSols);
      expect(decoded?.stops?.length).toBe(1);
    });
  });
});
