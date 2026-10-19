/**
 * MARS LANTERN — Terrain Analysis Engine
 * 
 * Implements Horn's method for slope and aspect, latitude-aware metric scaling,
 * strict nodata gap masking, and 5x5 detrended surface roughness.
 * 
 * Pure TypeScript — zero DOM, zero React.
 * Reference: MARS_LANTERN_ROUTING_ROVER_SPEC.md §7.1
 */

import { MARS_RADIUS_KM, clampLat, normalizeLon360 } from '../geo';

export const MARS_RADIUS_M = MARS_RADIUS_KM * 1000; // 3,389,500 meters

export interface Grid {
  data: Float32Array | Int16Array;  // row-major, north→south, west→east
  width: number;
  height: number;
  lat0: number;                     // North-most latitude of cell (row 0)
  lonE0: number;                    // West-most East-positive longitude (col 0)
  dLatDeg: number;                  // Positive degrees per cell row step (moving South)
  dLonDeg: number;                  // Positive degrees per cell column step (moving East)
  nodata: number;
}

export interface TerrainCell {
  slopeDeg: number | null;          // null when any of the 9 cells is nodata or on grid boundary
  aspectDeg: number | null;         // compass degrees (0° = North, 90° = East, 180° = South, 270° = West)
  roughnessM: number | null;        // 5x5 detrended standard deviation of elevation in meters
  rawRoughnessM?: number | null;    // raw standard deviation of elevation in meters
  hasData: boolean;
  polarDistortion: boolean;
}

export interface DerivedRasters {
  slopeU8: Uint8Array;              // 0–90°, 255 = no data
  roughU8: Uint8Array;              // 0–255 mapped to 0–510 m (2m/step), 255 = no data
  maskU8: Uint8Array;               // bit 0 = valid, bit 1 = polar distortion, bit 2 = hazard overlap
}

/**
 * Returns grid cell index (row, col) from latitude and East-positive longitude.
 */
export function getGridIndices(grid: Grid, lat: number, lonE: number): { row: number; col: number } {
  const cLat = clampLat(lat);
  const nLon = normalizeLon360(lonE);
  const row = Math.round((grid.lat0 - cLat) / grid.dLatDeg);
  const col = Math.round((nLon - grid.lonE0) / grid.dLonDeg);
  return { row, col };
}

/**
 * Reads elevation value from grid at (row, col). Returns null if outside grid or nodata.
 */
export function getElevationAt(grid: Grid, row: number, col: number): number | null {
  if (row < 0 || row >= grid.height || col < 0 || col >= grid.width) {
    return null;
  }
  const val = grid.data[row * grid.width + col];
  if (val === grid.nodata || !Number.isFinite(val)) {
    return null;
  }
  return val;
}

/**
 * Calculates Horn slope, aspect, and detrended roughness at (row, col).
 */
export function analyzeTerrainCell(grid: Grid, row: number, col: number): TerrainCell {
  const cellLat = grid.lat0 - row * grid.dLatDeg;
  const isPolar = Math.abs(cellLat) > 85.0;

  // 1. Boundary check: 3x3 requires 1-cell border
  if (row <= 0 || row >= grid.height - 1 || col <= 0 || col >= grid.width - 1) {
    return {
      slopeDeg: null,
      aspectDeg: null,
      roughnessM: null,
      hasData: false,
      polarDistortion: isPolar
    };
  }

  // 2. Fetch 3x3 window:
  // a b c (row - 1: North)
  // d e f (row: Center)
  // g h i (row + 1: South)
  const a = getElevationAt(grid, row - 1, col - 1);
  const b = getElevationAt(grid, row - 1, col);
  const c = getElevationAt(grid, row - 1, col + 1);
  const d = getElevationAt(grid, row, col - 1);
  const e = getElevationAt(grid, row, col);
  const f = getElevationAt(grid, row, col + 1);
  const g = getElevationAt(grid, row + 1, col - 1);
  const h = getElevationAt(grid, row + 1, col);
  const i = getElevationAt(grid, row + 1, col + 1);

  // Strict nodata rule: if ANY of the 9 cells is nodata, slope is null and hasData is false
  if (
    a === null || b === null || c === null ||
    d === null || e === null || f === null ||
    g === null || h === null || i === null
  ) {
    return {
      slopeDeg: null,
      aspectDeg: null,
      roughnessM: null,
      hasData: false,
      polarDistortion: isPolar
    };
  }

  // 3. Metric cell spacing (latitude-aware equirectangular grid)
  const rad = Math.PI / 180;
  // Clamp latitude to |lat| <= 89° to prevent cos(phi) -> 0 division by zero near poles
  const clampedPhi = Math.min(89.0, Math.max(-89.0, cellLat)) * rad;
  const deltaY = MARS_RADIUS_M * (grid.dLatDeg * rad);
  const deltaX = MARS_RADIUS_M * Math.cos(clampedPhi) * (grid.dLonDeg * rad);

  // 4. Horn's partial derivatives (Spec §7.1)
  // dzDx = ((c + 2f + i) - (a + 2d + g)) / (8 * deltaX) (East minus West)
  // dzDy = ((g + 2h + i) - (a + 2b + c)) / (8 * deltaY) (South minus North)
  const dzDx = ((c + 2 * f + i) - (a + 2 * d + g)) / (8 * deltaX);
  const dzDy = ((g + 2 * h + i) - (a + 2 * b + c)) / (8 * deltaY);

  const grad = Math.sqrt(dzDx * dzDx + dzDy * dzDy);
  const slopeDeg = (Math.atan(grad) * 180) / Math.PI;

  // Aspect = atan2(-dzDx, dzDy) in compass degrees (downhill direction)
  const aspectRad = Math.atan2(-dzDx, dzDy);
  const aspectDeg = ((aspectRad * 180) / Math.PI + 360) % 360;

  // 5. Roughness in 5x5 window (detrended)
  let roughnessM: number | null = null;
  let rawRoughnessM: number | null = null;

  if (row >= 2 && row <= grid.height - 3 && col >= 2 && col <= grid.width - 3) {
    const vals: { u: number; v: number; z: number }[] = [];
    let hasGap5x5 = false;
    let sumZ = 0;

    for (let v = -2; v <= 2; v++) { // v: North (-2) to South (+2)
      for (let u = -2; u <= 2; u++) { // u: West (-2) to East (+2)
        const z = getElevationAt(grid, row + v, col + u);
        if (z === null) {
          hasGap5x5 = true;
          break;
        }
        vals.push({ u, v, z });
        sumZ += z;
      }
      if (hasGap5x5) break;
    }

    if (!hasGap5x5 && vals.length === 25) {
      const meanZ = sumZ / 25;
      // Raw standard deviation
      const rawVar = vals.reduce((acc, pt) => acc + (pt.z - meanZ) ** 2, 0) / 25;
      rawRoughnessM = Math.sqrt(rawVar);

      // Fit plane: z(u, v) = c0 + cx * u + cy * v
      // On symmetric 5x5 grid, sum(u) = sum(v) = sum(uv) = 0
      // sum(u^2) = 5 * (4 + 1 + 0 + 1 + 4) = 50
      let sumUZ = 0;
      let sumVZ = 0;
      for (const pt of vals) {
        sumUZ += pt.u * pt.z;
        sumVZ += pt.v * pt.z;
      }
      const c0 = meanZ;
      const cx = sumUZ / 50;
      const cy = sumVZ / 50;

      // Residuals from fitted plane
      let sumResidSq = 0;
      for (const pt of vals) {
        const fittedZ = c0 + cx * pt.u + cy * pt.v;
        sumResidSq += (pt.z - fittedZ) ** 2;
      }
      roughnessM = Math.sqrt(sumResidSq / 25);
    }
  }

  return {
    slopeDeg,
    aspectDeg,
    roughnessM,
    rawRoughnessM,
    hasData: true,
    polarDistortion: isPolar
  };
}

/**
 * Computes derived rasters (slope_u8, rough_u8, mask_u8) for an entire grid.
 */
export function computeDerivedRasters(grid: Grid): DerivedRasters {
  const totalCells = grid.width * grid.height;
  const slopeU8 = new Uint8Array(totalCells);
  const roughU8 = new Uint8Array(totalCells);
  const maskU8 = new Uint8Array(totalCells);

  for (let r = 0; r < grid.height; r++) {
    for (let c = 0; c < grid.width; c++) {
      const idx = r * grid.width + c;
      const cell = analyzeTerrainCell(grid, r, c);

      if (!cell.hasData || cell.slopeDeg === null) {
        slopeU8[idx] = 255;
        roughU8[idx] = 255;
        maskU8[idx] = cell.polarDistortion ? 0x02 : 0x00; // bit 0 = 0 (invalid)
      } else {
        slopeU8[idx] = Math.min(90, Math.max(0, Math.round(cell.slopeDeg)));
        const rough = cell.roughnessM ?? 0;
        // Map 0–510 m to 0–255 (2m per unit, clamped at 254; 255 = nodata)
        roughU8[idx] = Math.min(254, Math.max(0, Math.round(rough / 2)));
        let mask = 0x01; // bit 0 = valid
        if (cell.polarDistortion) mask |= 0x02; // bit 1 = polar distortion
        maskU8[idx] = mask;
      }
    }
  }

  return { slopeU8, roughU8, maskU8 };
}
