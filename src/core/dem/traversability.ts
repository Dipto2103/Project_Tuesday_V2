/**
 * MARS LANTERN — Traversability Classification & Cost Modeling
 * 
 * Implements strict planetary traversability classes, vehicle mobility limits,
 * scientific guardrails (RSL > 27° always impassable, UNKNOWN impassable by default),
 * and precomputed cost raster generation.
 * 
 * Pure TypeScript — zero DOM, zero React.
 * Reference: MARS_LANTERN_ROUTING_ROVER_SPEC.md §7.3–§7.5
 */

import { type TerrainCell, type Grid } from './terrainAnalysis';
import {
  getVehicleSlopeLimitDeg,
  getVehicleCautionMinDeg,
  DEFAULT_ROUTING_COST_WEIGHTS,
  type RoutingCostWeights
} from '../../config/assumptions';

export type Vehicle = 'eva' | 'rover_unpressurised' | 'rover_pressurised';

export type TraversabilityClass =
  | 'FAVOURABLE'
  | 'CAUTION'
  | 'HIGH_RISK'
  | 'NON_TRAVERSABLE'
  | 'UNKNOWN';

export interface TraversabilityAssessment {
  terrainClass: TraversabilityClass;
  isTraversable: boolean;
  slopeDeg: number | null;
  roughnessM: number | null;
  slopeLimitDeg: number;
  reason?: string;
  source: 'SIMULATED ASSUMPTION';
}

/**
 * Classifies a terrain cell for a specific vehicle type per Spec §7.3.
 */
export function classifyTerrainCell(
  cell: TerrainCell,
  vehicle: Vehicle,
  options?: {
    isInHazardPolygon?: boolean;
    hasRslNearby?: boolean;
    hazardSeverity?: number; // 0 to 1
  }
): TraversabilityAssessment {
  const slopeLimitDeg = getVehicleSlopeLimitDeg(vehicle);
  const cautionMinDeg = getVehicleCautionMinDeg(vehicle);
  const cautionBandWidth = slopeLimitDeg - cautionMinDeg;
  const highRiskMinSlope = cautionMinDeg + (2 / 3) * cautionBandWidth;

  const isInHazard = options?.isInHazardPolygon ?? false;
  const hasRslNearby = options?.hasRslNearby ?? false;

  // 1. Data gap check: UNKNOWN terrain is never safe and impassable by default
  if (!cell.hasData || cell.slopeDeg === null || cell.roughnessM === null) {
    return {
      terrainClass: 'UNKNOWN',
      isTraversable: false,
      slopeDeg: null,
      roughnessM: null,
      slopeLimitDeg,
      reason: 'No valid terrain data (data gap). UNKNOWN terrain is impassable by default.',
      source: 'SIMULATED ASSUMPTION'
    };
  }

  const slope = cell.slopeDeg;
  const rough = cell.roughnessM;

  // 2. Hard scientific and vehicle stops:
  // - slope > 27° (RSL-class steep terrain / granular flow)
  // - slope >= vehicle limit
  // - inside a mapped hazard polygon
  if (slope > 27.0 || (hasRslNearby && slope > 27.0)) {
    return {
      terrainClass: 'NON_TRAVERSABLE',
      isTraversable: false,
      slopeDeg: slope,
      roughnessM: rough,
      slopeLimitDeg,
      reason: `Slope ${slope.toFixed(1)}° > 27° (RSL-class dry granular avalanche hazard).`,
      source: 'SIMULATED ASSUMPTION'
    };
  }

  if (slope >= slopeLimitDeg) {
    return {
      terrainClass: 'NON_TRAVERSABLE',
      isTraversable: false,
      slopeDeg: slope,
      roughnessM: rough,
      slopeLimitDeg,
      reason: `Slope ${slope.toFixed(1)}° reaches or exceeds ${vehicle} safety limit (${slopeLimitDeg}°).`,
      source: 'SIMULATED ASSUMPTION'
    };
  }

  if (isInHazard) {
    return {
      terrainClass: 'NON_TRAVERSABLE',
      isTraversable: false,
      slopeDeg: slope,
      roughnessM: rough,
      slopeLimitDeg,
      reason: 'Located within mapped planetary surface hazard perimeter.',
      source: 'SIMULATED ASSUMPTION'
    };
  }

  // 3. HIGH_RISK: caution band top 1/3, OR roughness > 300 m
  if (slope >= highRiskMinSlope || rough > 300.0) {
    return {
      terrainClass: 'HIGH_RISK',
      isTraversable: true,
      slopeDeg: slope,
      roughnessM: rough,
      slopeLimitDeg,
      reason:
        slope >= highRiskMinSlope
          ? `Slope ${slope.toFixed(1)}° in upper caution bracket (${highRiskMinSlope.toFixed(1)}°–${slopeLimitDeg}°).`
          : `Surface roughness (${rough.toFixed(0)}m) exceeds 300m threshold.`,
      source: 'SIMULATED ASSUMPTION'
    };
  }

  // 4. CAUTION: within caution band
  if (slope >= cautionMinDeg) {
    return {
      terrainClass: 'CAUTION',
      isTraversable: true,
      slopeDeg: slope,
      roughnessM: rough,
      slopeLimitDeg,
      reason: `Slope ${slope.toFixed(1)}° in caution band (${cautionMinDeg}°–${slopeLimitDeg}°).`,
      source: 'SIMULATED ASSUMPTION'
    };
  }

  // 5. FAVOURABLE: below caution band and roughness <= 150 m
  if (rough <= 150.0) {
    return {
      terrainClass: 'FAVOURABLE',
      isTraversable: true,
      slopeDeg: slope,
      roughnessM: rough,
      slopeLimitDeg,
      reason: 'Favourable gradient and smooth topography.',
      source: 'SIMULATED ASSUMPTION'
    };
  }

  // If roughness is between 150m and 300m while slope is below caution band
  return {
    terrainClass: 'CAUTION',
    isTraversable: true,
    slopeDeg: slope,
    roughnessM: rough,
    slopeLimitDeg,
    reason: `Moderate surface roughness (${rough.toFixed(0)}m).`,
    source: 'SIMULATED ASSUMPTION'
  };
}

/**
 * Computes base traversal cost per cell per vehicle (Spec §7.5).
 * baseCost = wd*1 + ws*slopePenalty(slope) + wr*roughPenalty(rough) + wh*hazardPenalty + wu*uncertainty
 */
export function calculateCellBaseCost(
  cell: TerrainCell,
  vehicle: Vehicle,
  weights: RoutingCostWeights = DEFAULT_ROUTING_COST_WEIGHTS,
  options?: {
    hazardSeverity?: number;
    isRegional?: boolean;
    riskTolerant?: boolean;
    isInHazard?: boolean;
  }
): number {
  const assessment = classifyTerrainCell(cell, vehicle, {
    isInHazardPolygon: options?.isInHazard ?? false,
    hazardSeverity: options?.hazardSeverity ?? 0
  });

  // Strict data-gap handling
  if (assessment.terrainClass === 'UNKNOWN') {
    if (options?.riskTolerant) {
      // Risk-tolerant crossing: wu * GAP_COST
      return weights.weight_cost_uncertainty * weights.gap_cost_multiplier;
    }
    return Infinity; // Impassable wall by default
  }

  if (assessment.terrainClass === 'NON_TRAVERSABLE') {
    return Infinity;
  }

  const slope = cell.slopeDeg ?? 0;
  const rough = cell.roughnessM ?? 0;
  const slopeLimit = assessment.slopeLimitDeg;

  // Quadratic slope penalty (gentle is cheap, near-limit is expensive)
  const slopeRatio = Math.max(0, Math.min(1.0, slope / slopeLimit));
  const slopePenalty = slopeRatio * slopeRatio;

  // Roughness penalty clamped at 500m
  const roughPenalty = Math.max(0, Math.min(1.0, rough / 500.0));

  // Hazard severity (0 to 1)
  const hazardPenalty = Math.max(0, Math.min(1.0, options?.hazardSeverity ?? 0));

  // Uncertainty term: 0.05 regional, 0.15 coarse
  const uncertainty = options?.isRegional ? 0.05 : 0.15;

  return (
    weights.weight_cost_distance * 1.0 +
    weights.weight_cost_slope * slopePenalty +
    weights.weight_cost_roughness * roughPenalty +
    weights.weight_cost_hazard * hazardPenalty +
    weights.weight_cost_uncertainty * uncertainty
  );
}

/**
 * Builds a precomputed Float32 cost raster in memory for an entire grid.
 */
export function buildCostRaster(
  grid: Grid,
  vehicle: Vehicle,
  weights: RoutingCostWeights = DEFAULT_ROUTING_COST_WEIGHTS,
  options?: {
    isRegional?: boolean;
    riskTolerant?: boolean;
  }
): Float32Array {
  const totalCells = grid.width * grid.height;
  const costRaster = new Float32Array(totalCells);

  for (let r = 0; r < grid.height; r++) {
    for (let c = 0; c < grid.width; c++) {
      const idx = r * grid.width + c;
      const cell: TerrainCell = {
        slopeDeg: null,
        aspectDeg: null,
        roughnessM: null,
        hasData: false,
        polarDistortion: false
      };

      // Query elevation
      const z = grid.data[idx];
      if (z === grid.nodata || !Number.isFinite(z)) {
        costRaster[idx] = options?.riskTolerant
          ? weights.weight_cost_uncertainty * weights.gap_cost_multiplier
          : Infinity;
        continue;
      }

      // Quick interior Horn evaluation
      if (r > 0 && r < grid.height - 1 && c > 0 && c < grid.width - 1) {
        const rad = Math.PI / 180;
        const cellLat = grid.lat0 - r * grid.dLatDeg;
        const clampedPhi = Math.min(89.0, Math.max(-89.0, cellLat)) * rad;
        const dy = 3389500 * (grid.dLatDeg * rad);
        const dx = 3389500 * Math.cos(clampedPhi) * (grid.dLonDeg * rad);

        const a = grid.data[(r - 1) * grid.width + (c - 1)];
        const b = grid.data[(r - 1) * grid.width + c];
        const cVal = grid.data[(r - 1) * grid.width + (c + 1)];
        const d = grid.data[r * grid.width + (c - 1)];
        const f = grid.data[r * grid.width + (c + 1)];
        const g = grid.data[(r + 1) * grid.width + (c - 1)];
        const h = grid.data[(r + 1) * grid.width + c];
        const i = grid.data[(r + 1) * grid.width + (c + 1)];

        if (
          a === grid.nodata || b === grid.nodata || cVal === grid.nodata ||
          d === grid.nodata || f === grid.nodata ||
          g === grid.nodata || h === grid.nodata || i === grid.nodata
        ) {
          costRaster[idx] = options?.riskTolerant
            ? weights.weight_cost_uncertainty * weights.gap_cost_multiplier
            : Infinity;
          continue;
        }

        const dzDx = ((cVal + 2 * f + i) - (a + 2 * d + g)) / (8 * dx);
        const dzDy = ((g + 2 * h + i) - (a + 2 * b + cVal)) / (8 * dy);
        const grad = Math.sqrt(dzDx * dzDx + dzDy * dzDy);
        cell.slopeDeg = (Math.atan(grad) * 180) / Math.PI;
        cell.roughnessM = 50.0; // nominal baseline
        cell.hasData = true;

        costRaster[idx] = calculateCellBaseCost(cell, vehicle, weights, options);
      } else {
        // Border cell
        costRaster[idx] = options?.riskTolerant
          ? weights.weight_cost_uncertainty * weights.gap_cost_multiplier
          : Infinity;
      }
    }
  }

  return costRaster;
}
