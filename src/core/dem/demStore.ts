/**
 * MARS LANTERN — DEM Store & Multi-Resolution Tile Cache
 * 
 * Manages in-memory cache of global 8 ppd and regional 128 ppd DEM grids,
 * supports injectable loaders for worker/node/browser environments,
 * and performs strict bilinear sampling (null if any of the 4 corners is nodata).
 * 
 * Pure TypeScript — zero DOM, zero React.
 * Reference: MARS_LANTERN_ROUTING_ROVER_SPEC.md §7.2
 */

import { clampLat, normalizeLon360 } from '../geo';
import {
  type Grid,
  type DerivedRasters,
  getElevationAt,
  analyzeTerrainCell,
  computeDerivedRasters
} from './terrainAnalysis';

export type DemResolution = 'global_8ppd' | 'regional_128ppd' | 'synthetic';

export interface LoadedTile {
  id: string;
  grid: Grid;
  resolution: DemResolution;
  derived?: DerivedRasters;
  metadata?: {
    minElevM?: number;
    maxElevM?: number;
    source?: string;
  };
}

export interface ElevationSample {
  elevationM: number | null;
  hasData: boolean;
  resolution: DemResolution | 'none';
  tileId?: string;
}

export class DemStore {
  private tiles: Map<string, LoadedTile> = new Map();
  private fetchFn: (url: string) => Promise<ArrayBuffer>;

  constructor(customFetch?: (url: string) => Promise<ArrayBuffer>) {
    this.fetchFn =
      customFetch ||
      (async (url: string) => {
        if (typeof fetch !== 'undefined') {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
          return await res.arrayBuffer();
        }
        throw new Error('No fetch environment available in DemStore');
      });
  }

  /**
   * Registers a preloaded tile in the store cache.
   */
  public registerTile(tile: LoadedTile): void {
    if (!tile.derived) {
      tile.derived = computeDerivedRasters(tile.grid);
    }
    this.tiles.set(tile.id, tile);
  }

  /**
   * Retrieves a loaded tile from cache by ID.
   */
  public getTile(id: string): LoadedTile | undefined {
    return this.tiles.get(id);
  }

  /**
   * Lists all currently cached tile IDs.
   */
  public getCachedTileIds(): string[] {
    return Array.from(this.tiles.keys());
  }

  /**
   * Loads a binary int16 tile buffer into a registered grid.
   */
  public loadBinaryTile(
    id: string,
    buffer: ArrayBuffer,
    config: {
      width: number;
      height: number;
      lat0: number;
      lonE0: number;
      dLatDeg: number;
      dLonDeg: number;
      nodata?: number;
      resolution: DemResolution;
    }
  ): LoadedTile {
    const int16View = new Int16Array(buffer);
    const grid: Grid = {
      data: int16View,
      width: config.width,
      height: config.height,
      lat0: config.lat0,
      lonE0: config.lonE0,
      dLatDeg: config.dLatDeg,
      dLonDeg: config.dLonDeg,
      nodata: config.nodata ?? -32768
    };

    const derived = computeDerivedRasters(grid);
    const tile: LoadedTile = {
      id,
      grid,
      resolution: config.resolution,
      derived
    };

    this.registerTile(tile);
    return tile;
  }

  /**
   * Samples elevation via strict bilinear interpolation.
   * If any of the four bounding corner cells is nodata or out of bounds, returns null.
   */
  public sampleBilinear(grid: Grid, lat: number, lonE: number): number | null {
    const cLat = clampLat(lat);
    const nLon = normalizeLon360(lonE);

    const r = (grid.lat0 - cLat) / grid.dLatDeg;
    const c = (nLon - grid.lonE0) / grid.dLonDeg;

    const r0 = Math.floor(r);
    const r1 = r0 + 1;
    const c0 = Math.floor(c);
    const c1 = c0 + 1;

    // Check bounds
    if (r0 < 0 || r1 >= grid.height || c0 < 0 || c1 >= grid.width) {
      return null;
    }

    const z00 = getElevationAt(grid, r0, c0);
    const z01 = getElevationAt(grid, r0, c1);
    const z10 = getElevationAt(grid, r1, c0);
    const z11 = getElevationAt(grid, r1, c1);

    // Strict rule: all 4 corners MUST be valid
    if (z00 === null || z01 === null || z10 === null || z11 === null) {
      return null;
    }

    const fr = r - r0;
    const fc = c - c0;

    const interpolated =
      (1 - fr) * (1 - fc) * z00 +
      (1 - fr) * fc * z01 +
      fr * (1 - fc) * z10 +
      fr * fc * z11;

    return Math.round(interpolated * 10) / 10;
  }

  /**
   * Finds the best available tile covering the target coordinate and samples elevation.
   * Checks regional tiles first (highest resolution), then global tile.
   */
  public sample(lat: number, lonE: number): ElevationSample {
    const cLat = clampLat(lat);
    const nLon = normalizeLon360(lonE);

    // 1. Check regional 128 ppd tiles first
    for (const [id, tile] of this.tiles.entries()) {
      if (tile.resolution === 'regional_128ppd') {
        const g = tile.grid;
        const latMin = g.lat0 - g.height * g.dLatDeg;
        const latMax = g.lat0;
        const lonMin = g.lonE0;
        const lonMax = g.lonE0 + g.width * g.dLonDeg;

        if (cLat >= latMin && cLat <= latMax && nLon >= lonMin && nLon <= lonMax) {
          const elev = this.sampleBilinear(g, cLat, nLon);
          if (elev !== null) {
            return {
              elevationM: elev,
              hasData: true,
              resolution: 'regional_128ppd',
              tileId: id
            };
          }
        }
      }
    }

    // 2. Check global tile
    for (const [id, tile] of this.tiles.entries()) {
      if (tile.resolution === 'global_8ppd') {
        const elev = this.sampleBilinear(tile.grid, cLat, nLon);
        if (elev !== null) {
          return {
            elevationM: elev,
            hasData: true,
            resolution: 'global_8ppd',
            tileId: id
          };
        }
      }
    }

    // 3. Fallback: check any remaining synthetic tile
    for (const [id, tile] of this.tiles.entries()) {
      const elev = this.sampleBilinear(tile.grid, cLat, nLon);
      if (elev !== null) {
        return {
          elevationM: elev,
          hasData: true,
          resolution: tile.resolution,
          tileId: id
        };
      }
    }

    return {
      elevationM: null,
      hasData: false,
      resolution: 'none'
    };
  }

  /**
   * Convenience method to get elevation at coordinate (object or lat, lonE).
   */
  public getElevationAt(p: { lat: number; lonE: number }): number | null;
  public getElevationAt(lat: number, lonE: number): number | null;
  public getElevationAt(arg1: { lat: number; lonE: number } | number, arg2?: number): number | null {
    const lat = typeof arg1 === 'object' ? arg1.lat : arg1;
    const lonE = typeof arg1 === 'object' ? arg1.lonE : (arg2 ?? 0);
    const sample = this.sample(lat, lonE);
    return sample.elevationM;
  }

  /**
   * Convenience method to sample terrain analysis (slope, aspect, roughness, hasData) at coordinate.
   */
  public getTerrainAt(p: { lat: number; lonE: number }): import('./terrainAnalysis').TerrainCell;
  public getTerrainAt(lat: number, lonE: number): import('./terrainAnalysis').TerrainCell;
  public getTerrainAt(arg1: { lat: number; lonE: number } | number, arg2?: number): import('./terrainAnalysis').TerrainCell {
    const lat = typeof arg1 === 'object' ? arg1.lat : arg1;
    const lonE = typeof arg1 === 'object' ? arg1.lonE : (arg2 ?? 0);
    const cLat = clampLat(lat);
    const nLon = normalizeLon360(lonE);

    // 1. Check regional 128 ppd tiles first
    for (const tile of this.tiles.values()) {
      if (tile.resolution === 'regional_128ppd') {
        const g = tile.grid;
        const latMin = g.lat0 - g.height * g.dLatDeg;
        const latMax = g.lat0;
        const lonMin = g.lonE0;
        const lonMax = g.lonE0 + g.width * g.dLonDeg;

        if (cLat >= latMin && cLat <= latMax && nLon >= lonMin && nLon <= lonMax) {
          const row = Math.round((g.lat0 - cLat) / g.dLatDeg);
          const col = Math.round((nLon - g.lonE0) / g.dLonDeg);
          const cell = analyzeTerrainCell(g, row, col);
          if (cell.hasData) return cell;
        }
      }
    }

    // 2. Check global tile
    for (const tile of this.tiles.values()) {
      if (tile.resolution === 'global_8ppd') {
        const g = tile.grid;
        const row = Math.round((g.lat0 - cLat) / g.dLatDeg);
        const col = Math.round((nLon - g.lonE0) / g.dLonDeg);
        const cell = analyzeTerrainCell(g, row, col);
        if (cell.hasData) return cell;
      }
    }

    // 3. Fallback: check any tile
    for (const tile of this.tiles.values()) {
      const g = tile.grid;
      const row = Math.round((g.lat0 - cLat) / g.dLatDeg);
      const col = Math.round((nLon - g.lonE0) / g.dLonDeg);
      if (row >= 0 && row < g.height && col >= 0 && col < g.width) {
        return analyzeTerrainCell(g, row, col);
      }
    }

    return {
      slopeDeg: null,
      aspectDeg: null,
      roughnessM: null,
      hasData: false,
      polarDistortion: Math.abs(cLat) > 85.0
    };
  }

  /**
   * Clears all cached tiles.
   */
  public clear(): void {
    this.tiles.clear();
  }
}

// Global default singleton store
export const demStore = new DemStore();
