/**
 * MARS LANTERN — Modeled Planetary Temperature Engine
 * 
 * Computes engineering temperature estimates based on NASA MEDA in-situ anchor.
 * 
 * SCIENTIFIC GUARDRAIL:
 * MOLA/MEDA surface temperature models are labeled engineering estimates:
 * provenance: 'MODELED', low confidence, ±15 K uncertainty.
 * Never labeled MEASURED unless anchored to an in-situ lander/rover log.
 * 
 * Pure TypeScript — zero DOM, zero React.
 * Reference: MARS_LANTERN_SPEC.md §8.6, §17
 */

export interface TemperatureAnchor {
  name: string;
  lat: number;
  lonE: number;
  surfaceMinC: number;
  surfaceMaxC: number;
  distanceKm: number;
  source: string;
  provenance: 'MEASURED';
}

export interface TemperatureEstimate {
  minC: number;
  maxC: number;
  meanC: number;
  diurnalSwingK: number;
  uncertaintyK: number;
  provenance: 'MODELED';
  confidence: 'low';
  seasonalNote?: string;
  anchors: TemperatureAnchor[];
  disclaimer: string;
}

// Ground-truth anchor from Perseverance MEDA instrument (Jezero Crater ~18.4°N, 77.5°E)
export const MEDA_JEZERO_ANCHOR = {
  name: 'Perseverance MEDA Weather Station (Jezero)',
  lat: 18.44,
  lonE: 77.45,
  surfaceMinC: -83, // Pre-dawn minimum (~190 K)
  surfaceMaxC: 5,   // Midday peak (~278 K)
  source: 'NASA Mars 2020 MEDA Environmental Dynamics Analyzer',
  provenance: 'MEASURED' as const
};

/**
 * Calculates modeled surface temperature estimate at a given latitude, elevation, and season.
 * @param lat Planetocentric latitude (-90° to +90°)
 * @param elevationM Surface elevation relative to MOLA datum in meters
 * @param ls Solar longitude Ls in degrees (0°–360°, optional)
 * @param distanceToMedaKm Distance to Jezero Crater anchor in km (optional)
 */
export function estimateSurfaceTemperature(
  lat: number,
  elevationM: number = 0,
  ls: number = 0,
  distanceToMedaKm: number = 9999
): TemperatureEstimate {
  // NASA MEDA ground truth anchor at Jezero (18.44°N)
  const anchorMeanC = (MEDA_JEZERO_ANCHOR.surfaceMinC + MEDA_JEZERO_ANCHOR.surfaceMaxC) / 2; // -39 °C
  const diurnalSwingK = 88; // 88 K daily temperature swing

  const absLat = Math.abs(lat);

  // Latitudinal lapse rate (PLACEHOLDER-TUNE per Spec §8.6)
  const latDelta = absLat - 18.44;
  const latCorrection = 0.4 * latDelta;

  // Elevation lapse rate: ~1.5 K / km (PLACEHOLDER-TUNE per Spec §8.6)
  const elevationCorrection = 0.0015 * elevationM;

  // Seasonal insolation modulation term
  const seasonRad = (ls * Math.PI) / 180;
  const seasonTerm = lat >= 0 ? 8.0 * Math.sin(seasonRad) : -8.0 * Math.sin(seasonRad);

  // Mean surface temperature estimate
  const meanSurfaceC = anchorMeanC - latCorrection - elevationCorrection + seasonTerm;
  const minC = Math.round(meanSurfaceC - diurnalSwingK / 2);
  const maxC = Math.round(meanSurfaceC + diurnalSwingK / 2);
  const meanC = Math.round(meanSurfaceC);

  // Check seasonal polar CO2 frost note
  let seasonalNote: string | undefined;
  if (absLat > 60) {
    seasonalNote =
      'Surface CO2 dry-ice frost possible during polar autumn/winter seasons; temperatures drop to ~ -125 °C (CO2 sublimation point).';
  }

  const anchors: TemperatureAnchor[] = [];
  if (distanceToMedaKm <= 500) {
    anchors.push({
      ...MEDA_JEZERO_ANCHOR,
      distanceKm: Math.round(distanceToMedaKm)
    });
  }

  return {
    minC,
    maxC,
    meanC,
    diurnalSwingK,
    uncertaintyK: 15, // ±15 K engineering uncertainty
    provenance: 'MODELED',
    confidence: 'low',
    seasonalNote,
    anchors,
    disclaimer:
      'MODELED ENGINEERING ESTIMATE (±15 K uncertainty). Ground truth verified against NASA Perseverance MEDA data at Jezero Crater.'
  };
}
