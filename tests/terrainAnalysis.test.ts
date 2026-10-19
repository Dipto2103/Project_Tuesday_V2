import { describe, it, expect } from 'vitest';
import {
  type Grid,
  analyzeTerrainCell,
  computeDerivedRasters,
  MARS_RADIUS_M
} from '../src/core/dem/terrainAnalysis';
import { DemStore, type LoadedTile } from '../src/core/dem/demStore';

describe('Terrain Analysis & Horn Slope Engine (Spec §7)', () => {
  // Helper to create a synthetic grid with uniform cell spacing
  function createSyntheticGrid(
    width: number,
    height: number,
    fillFn: (row: number, col: number) => number,
    lat0 = 0,
    lonE0 = 0,
    dLatDeg = 0.001,
    dLonDeg = 0.001,
    nodata = -32768
  ): Grid {
    const data = new Float32Array(width * height);
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        data[r * width + c] = fillFn(r, c);
      }
    }
    return { data, width, height, lat0, lonE0, dLatDeg, dLonDeg, nodata };
  }

  it('measures flat plane slope as exactly 0°', () => {
    const grid = createSyntheticGrid(10, 10, () => 500);
    const cell = analyzeTerrainCell(grid, 5, 5);

    expect(cell.hasData).toBe(true);
    expect(cell.slopeDeg).toBeCloseTo(0.0, 4);
    expect(cell.roughnessM).toBeCloseTo(0.0, 4);
  });

  it('Horn slope on 20m rise over 100m horizontal yields 11.31° ±0.05°', () => {
    // At equator (lat 0), deltaX = MARS_RADIUS_M * dLonDeg * (PI/180)
    // To get exactly 100m horizontal spacing per cell:
    // dLonDeg = 100 / (MARS_RADIUS_M * PI / 180)
    const rad = Math.PI / 180;
    const dLonDeg = 100 / (MARS_RADIUS_M * rad);
    const dLatDeg = 100 / (MARS_RADIUS_M * rad);

    // Ramp rising 20m per 100m eastward (dz/dx = 20 / 100 = 0.2)
    // z(row, col) = col * 20
    const grid = createSyntheticGrid(10, 10, (_r, c) => c * 20, 0, 0, dLatDeg, dLonDeg);
    const cell = analyzeTerrainCell(grid, 5, 5);

    expect(cell.hasData).toBe(true);
    // atan(0.2) * 180 / PI ≈ 11.30993°
    expect(cell.slopeDeg).toBeCloseTo(11.31, 1);
    expect(Math.abs((cell.slopeDeg ?? 0) - 11.31)).toBeLessThanOrEqual(0.05);
  });

  it('correctly calculates aspect for East-West and North-South slopes', () => {
    const dDeg = 0.001;
    // Slope down to the East (col 0 is high, col 9 is low -> downhill East = 90°)
    const eastSlope = createSyntheticGrid(10, 10, (_r, c) => (10 - c) * 50, 0, 0, dDeg, dDeg);
    const eastCell = analyzeTerrainCell(eastSlope, 5, 5);
    expect(eastCell.aspectDeg).toBeCloseTo(90, 1);

    // Slope down to the West (col 9 is high, col 0 is low -> downhill West = 270°)
    const westSlope = createSyntheticGrid(10, 10, (_r, c) => c * 50, 0, 0, dDeg, dDeg);
    const westCell = analyzeTerrainCell(westSlope, 5, 5);
    expect(westCell.aspectDeg).toBeCloseTo(270, 1);

    // Slope down to the North (row 9 is high south, row 0 is low north -> downhill North = 0° / 360°)
    const northSlope = createSyntheticGrid(10, 10, (r, _c) => r * 50, 0, 0, dDeg, dDeg);
    const northCell = analyzeTerrainCell(northSlope, 5, 5);
    expect(northCell.aspectDeg).toBeCloseTo(0, 1);

    // Slope down to the South (row 0 is high north, row 9 is low south -> downhill South = 180°)
    const southSlope = createSyntheticGrid(10, 10, (r, _c) => (10 - r) * 50, 0, 0, dDeg, dDeg);
    const southCell = analyzeTerrainCell(southSlope, 5, 5);
    expect(southCell.aspectDeg).toBeCloseTo(180, 1);
  });

  it('STRICT NODATA RULE: a single nodata cell nullifies all 8 surrounding cells', () => {
    const grid = createSyntheticGrid(7, 7, () => 200);
    // Put nodata at center (row 3, col 3)
    grid.data[3 * 7 + 3] = grid.nodata;

    // Center itself must be null
    expect(analyzeTerrainCell(grid, 3, 3).slopeDeg).toBeNull();
    expect(analyzeTerrainCell(grid, 3, 3).hasData).toBe(false);

    // All 8 direct neighbors around (3, 3) must be nullified
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const neighbor = analyzeTerrainCell(grid, 3 + dr, 3 + dc);
        expect(neighbor.slopeDeg).toBeNull();
        expect(neighbor.hasData).toBe(false);
      }
    }

    // A cell outside the 3x3 halo (e.g. 1, 1) remains valid
    const outsideCell = analyzeTerrainCell(grid, 1, 1);
    expect(outsideCell.hasData).toBe(true);
    expect(outsideCell.slopeDeg).toBeCloseTo(0.0, 2);
  });

  it('shrinks deltaX by cos(phi) = 0.5 at 60° latitude', () => {
    const rad = Math.PI / 180;
    const dDeg = 0.001;

    // At 60° latitude, cos(60°) = 0.5, so dx is half the size.
    // For the same elevation change per column, the slope at 60° is steeper by ~2x the gradient!
    const gridEquator = createSyntheticGrid(10, 10, (_r, c) => c * 10, 0, 0, dDeg, dDeg);
    const grid60Deg = createSyntheticGrid(10, 10, (_r, c) => c * 10, 60, 0, dDeg, dDeg);

    const cellEquator = analyzeTerrainCell(gridEquator, 5, 5);
    const cell60 = analyzeTerrainCell(grid60Deg, 5, 5);

    expect(cellEquator.hasData).toBe(true);
    expect(cell60.hasData).toBe(true);

    const gradEquator = Math.tan(((cellEquator.slopeDeg ?? 0) * rad));
    const grad60 = Math.tan(((cell60.slopeDeg ?? 0) * rad));

    // dx_60 = 0.5 * dx_0 => grad_60 = 2.0 * grad_0
    expect(grad60 / gradEquator).toBeCloseTo(2.0, 2);
  });

  it('detrended roughness yields ~0 on a smooth tilted ramp', () => {
    // 5x5 window on a planar slope z = 10*row + 25*col
    const grid = createSyntheticGrid(10, 10, (r, c) => r * 10 + c * 25);
    const cell = analyzeTerrainCell(grid, 5, 5);

    expect(cell.hasData).toBe(true);
    // Raw standard deviation is non-zero because elevation changes across the 5x5 window
    expect(cell.rawRoughnessM).toBeGreaterThan(10);
    // Detrended roughness removes the fitted local plane and gives ~0
    expect(cell.roughnessM).toBeCloseTo(0.0, 3);
  });

  it('computes derived rasters with valid byte representations and mask flags', () => {
    const grid = createSyntheticGrid(6, 6, (r, c) => (r + c) * 10, 86, 0); // Polar latitude
    const derived = computeDerivedRasters(grid);

    expect(derived.slopeU8.length).toBe(36);
    expect(derived.roughU8.length).toBe(36);
    expect(derived.maskU8.length).toBe(36);

    // Boundary cells have nodata marker (255)
    expect(derived.slopeU8[0]).toBe(255);
    // Interior cell has polar distortion flag set (bit 1 = 0x02)
    const interiorIdx = 2 * 6 + 2;
    expect((derived.maskU8[interiorIdx] & 0x02)).toBe(0x02);
  });

  it('DemStore: performs strict bilinear interpolation and handles nodata correctly', () => {
    const store = new DemStore();
    const grid = createSyntheticGrid(4, 4, (r, c) => r * 100 + c * 50, 10, 10, 1, 1);

    const tile: LoadedTile = {
      id: 'test-tile',
      grid,
      resolution: 'regional_128ppd'
    };
    store.registerTile(tile);

    // Midpoint between row 1 (lat 9) and row 2 (lat 8), col 1 (lon 11) and col 2 (lon 12)
    // lat = 8.5, lonE = 11.5
    // z00 = 1*100 + 1*50 = 150
    // z01 = 1*100 + 2*50 = 200
    // z10 = 2*100 + 1*50 = 250
    // z11 = 2*100 + 2*50 = 300
    // Bilinear midpoint = (150 + 200 + 250 + 300) / 4 = 225
    const sample = store.sample(8.5, 11.5);
    expect(sample.hasData).toBe(true);
    expect(sample.elevationM).toBeCloseTo(225.0, 1);

    // Corrupt one corner of that box (row 2, col 2 -> nodata)
    grid.data[2 * 4 + 2] = grid.nodata;
    const corruptedSample = store.sample(8.5, 11.5);
    // Bilinear MUST be null because 1 of 4 corners is nodata
    expect(corruptedSample.hasData).toBe(false);
    expect(corruptedSample.elevationM).toBeNull();
  });
});
