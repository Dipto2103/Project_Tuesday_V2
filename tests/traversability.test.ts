import { describe, it, expect, beforeEach } from 'vitest';
import {
  classifyTerrainCell,
  calculateCellBaseCost,
  buildCostRaster,
  type TraversabilityAssessment
} from '../src/core/dem/traversability';
import {
  MISSION_ASSUMPTIONS,
  updateAssumptionValue,
  resetAssumptionsToDefaults,
  getVehicleSlopeLimitDeg,
  getVehicleCautionMinDeg
} from '../src/config/assumptions';
import { type TerrainCell, type Grid } from '../src/core/dem/terrainAnalysis';

describe('Traversability Classification & Cost Raster (Spec §7.3–§7.5)', () => {
  beforeEach(() => {
    resetAssumptionsToDefaults();
  });

  const validCell = (slopeDeg: number, roughnessM = 50): TerrainCell => ({
    slopeDeg,
    aspectDeg: 90,
    roughnessM,
    hasData: true,
    polarDistortion: false
  });

  const nodataCell: TerrainCell = {
    slopeDeg: null,
    aspectDeg: null,
    roughnessM: null,
    hasData: false,
    polarDistortion: false
  };

  it('BOUNDARY TEST: slope exactly at vehicle limit is NON_TRAVERSABLE', () => {
    // EVA limit is 15°
    expect(getVehicleSlopeLimitDeg('eva')).toBe(15.0);

    const cellAtLimit = validCell(15.0);
    const result = classifyTerrainCell(cellAtLimit, 'eva');

    expect(result.terrainClass).toBe('NON_TRAVERSABLE');
    expect(result.isTraversable).toBe(false);

    // 14.99° is traversable (in caution/high risk band)
    const cellJustBelow = validCell(14.99);
    expect(classifyTerrainCell(cellJustBelow, 'eva').isTraversable).toBe(true);
  });

  it('STRICT GUARDRAIL: UNKNOWN terrain is impassable by default', () => {
    const assessment = classifyTerrainCell(nodataCell, 'eva');
    expect(assessment.terrainClass).toBe('UNKNOWN');
    expect(assessment.isTraversable).toBe(false);

    // Default cost is Infinity (impassable wall)
    const defaultCost = calculateCellBaseCost(nodataCell, 'eva');
    expect(defaultCost).toBe(Infinity);

    // Risk-tolerant mode allows crossing at wu * GAP_COST
    const riskTolerantCost = calculateCellBaseCost(nodataCell, 'eva', undefined, {
      riskTolerant: true
    });
    expect(Number.isFinite(riskTolerantCost)).toBe(true);
    // wu (2.0) * gap_cost_multiplier (8.0) = 16.0
    expect(riskTolerantCost).toBe(16.0);
  });

  it('SCIENTIFIC GUARDRAIL: RSL slopes > 27° are always NON_TRAVERSABLE regardless of vehicle', () => {
    const steepCell = validCell(27.5);

    // Even if an unpressurized rover had a hypothetical high limit
    const evaResult = classifyTerrainCell(steepCell, 'eva');
    const roverResult = classifyTerrainCell(steepCell, 'rover_unpressurised');

    expect(evaResult.terrainClass).toBe('NON_TRAVERSABLE');
    expect(roverResult.terrainClass).toBe('NON_TRAVERSABLE');
    expect(evaResult.reason).toContain('RSL-class');
  });

  it('classifies caution band and top 1/3 as HIGH_RISK', () => {
    // EVA: caution band is 10° to 15°.
    // Band width = 5°. Top 1/3 is 13.33° to 15°.
    const midCautionCell = validCell(11.0);
    expect(classifyTerrainCell(midCautionCell, 'eva').terrainClass).toBe('CAUTION');

    const topThirdCell = validCell(14.0);
    expect(classifyTerrainCell(topThirdCell, 'eva').terrainClass).toBe('HIGH_RISK');
  });

  it('classifies roughness > 300m as HIGH_RISK and <= 150m as FAVOURABLE', () => {
    // Gentle 5° slope
    const smoothCell = validCell(5.0, 100.0);
    expect(classifyTerrainCell(smoothCell, 'eva').terrainClass).toBe('FAVOURABLE');

    const roughCell = validCell(5.0, 350.0);
    expect(classifyTerrainCell(roughCell, 'eva').terrainClass).toBe('HIGH_RISK');
  });

  it('computes quadratic slope penalty and edge costs correctly', () => {
    const flatCell = validCell(0.0, 0.0);
    const halfLimitCell = validCell(7.5, 0.0); // 7.5 / 15 = 0.5 ratio -> slopePenalty = 0.25

    const costFlat = calculateCellBaseCost(flatCell, 'eva', undefined, { isRegional: true });
    const costHalf = calculateCellBaseCost(halfLimitCell, 'eva', undefined, { isRegional: true });

    // baseCost = wd*1 + ws*(slope/limit)^2 + wr*(rough/500) + wh*hazard + wu*uncertainty
    // wd=1.0, ws=4.0, wr=1.5, wh=6.0, wu=2.0, uncertainty(regional)=0.05
    // costFlat = 1.0 + 4.0*0 + 0 + 0 + 2.0*0.05 = 1.10
    expect(costFlat).toBeCloseTo(1.1, 3);

    // costHalf = 1.0 + 4.0*(0.25) + 0 + 0 + 0.10 = 2.10
    expect(costHalf).toBeCloseTo(2.1, 3);
  });

  it('buildCostRaster generates valid Float32 array matching grid dimensions', () => {
    const width = 6;
    const height = 6;
    const data = new Float32Array(width * height).fill(500);
    // Put a nodata hole
    data[2 * width + 2] = -32768;

    const grid: Grid = {
      data,
      width,
      height,
      lat0: 0,
      lonE0: 0,
      dLatDeg: 0.01,
      dLonDeg: 0.01,
      nodata: -32768
    };

    const costRaster = buildCostRaster(grid, 'eva');
    expect(costRaster.length).toBe(36);
    // Hole must be Infinity
    expect(costRaster[2 * width + 2]).toBe(Infinity);
  });

  it('allows editing assumptions and resetting to defaults', () => {
    expect(getVehicleSlopeLimitDeg('eva')).toBe(15.0);

    // Update slope limit
    updateAssumptionValue('slope_limit_eva_deg', 12.0);
    expect(getVehicleSlopeLimitDeg('eva')).toBe(12.0);

    // Reset back to defaults
    resetAssumptionsToDefaults();
    expect(getVehicleSlopeLimitDeg('eva')).toBe(15.0);
  });
});
