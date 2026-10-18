/**
 * MARS LANTERN — Terrain Quality Scoring Engine
 * 
 * Computes deterministic terrain quality score (0–100) and traversability classification
 * based on local slope, surface roughness, nearby hazard proximity, and data resolution.
 * 
 * Pure TypeScript — zero DOM, zero React.
 * Reference: MARS_LANTERN_SPEC.md §8.5
 */

export interface TerrainQualityAssessment {
  quality: number | null;
  class: 'Favourable' | 'Moderate' | 'Difficult' | 'Hazardous' | 'UNKNOWN';
  traversable: boolean;
  terms: {
    slopeTerm: number;
    roughTerm: number;
    hazardTerm: number;
    uncertaintyTerm: number;
    penalty: number;
  };
  assumptions: string[];
}

export interface TerrainScoringInputs {
  slopeDeg: number | null;
  roughnessM: number | null;
  maxHazardSeverityWithin25km?: 'low' | 'moderate' | 'high' | 'critical' | null;
  isHighResolution?: boolean;
  slopeLimitDeg?: number; // default rover: 20°, EVA: 15°
  hasRslNearby?: boolean;
}

/**
 * Computes deterministic terrain quality score and breakdown terms.
 */
export function calculateTerrainQuality(
  inputs: TerrainScoringInputs
): TerrainQualityAssessment {
  const {
    slopeDeg,
    roughnessM,
    maxHazardSeverityWithin25km = null,
    isHighResolution = false,
    slopeLimitDeg = 20.0,
    hasRslNearby = false
  } = inputs;

  const assumptions: string[] = [
    `Vehicle maximum traversable slope limit: ${slopeLimitDeg}°`,
    'Roughness penalty normalization reference: 500 meters scale',
    'Hazard proximity search radius: 25 km footprint buffer'
  ];

  if (slopeDeg === null || roughnessM === null) {
    return {
      quality: null,
      class: 'UNKNOWN',
      traversable: false,
      terms: {
        slopeTerm: 0,
        roughTerm: 0,
        hazardTerm: 0,
        uncertaintyTerm: 1.0,
        penalty: 1.0
      },
      assumptions
    };
  }

  // 1. Slope Term
  const slopeTerm = Math.min(1.0, Math.max(0.0, slopeDeg / slopeLimitDeg));

  // 2. Roughness Term
  const roughTerm = Math.min(1.0, Math.max(0.0, roughnessM / 500.0));

  // 3. Hazard Term (0.0 to 1.0)
  let hazardTerm = 0.0;
  if (maxHazardSeverityWithin25km === 'critical') hazardTerm = 1.0;
  else if (maxHazardSeverityWithin25km === 'high') hazardTerm = 0.75;
  else if (maxHazardSeverityWithin25km === 'moderate') hazardTerm = 0.45;
  else if (maxHazardSeverityWithin25km === 'low') hazardTerm = 0.2;

  // 4. Uncertainty Term (0.15 for coarse global, 0.05 for regional HiRISE)
  const uncertaintyTerm = isHighResolution ? 0.05 : 0.15;

  // Composite Penalty Formula (Spec §8.5)
  // penalty = 0.45*slopeTerm + 0.25*roughTerm + 0.20*hazardTerm + 0.10*uncertainty
  const penalty =
    0.45 * slopeTerm + 0.25 * roughTerm + 0.2 * hazardTerm + 0.1 * uncertaintyTerm;

  const quality = Math.round(100 * Math.max(0, 1 - penalty));

  // Hard scientific guardrails:
  // - Slopes >= vehicle limit are non-traversable
  // - RSL-bearing slopes (>27°) are always non-traversable
  const isTooSteep = slopeDeg >= slopeLimitDeg;
  const isRslImpassable = hasRslNearby && slopeDeg > 27.0;
  const traversable = !isTooSteep && !isRslImpassable && quality >= 30;

  // Classify score
  let terrainClass: TerrainQualityAssessment['class'];
  if (quality >= 80) terrainClass = 'Favourable';
  else if (quality >= 60) terrainClass = 'Moderate';
  else if (quality >= 40) terrainClass = 'Difficult';
  else terrainClass = 'Hazardous';

  if (isTooSteep) {
    assumptions.push(`NON-TRAVERSABLE: Slope (${slopeDeg}°) exceeds vehicle limit (${slopeLimitDeg}°).`);
  }
  if (isRslImpassable) {
    assumptions.push('NON-TRAVERSABLE: RSL steep granular avalanche terrain (>27°).');
  }

  return {
    quality,
    class: terrainClass,
    traversable,
    terms: {
      slopeTerm: parseFloat(slopeTerm.toFixed(3)),
      roughTerm: parseFloat(roughTerm.toFixed(3)),
      hazardTerm: parseFloat(hazardTerm.toFixed(3)),
      uncertaintyTerm: parseFloat(uncertaintyTerm.toFixed(3)),
      penalty: parseFloat(penalty.toFixed(3))
    },
    assumptions
  };
}
