import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { LayerSchema } from '../src/core/types';

describe('Layer Registry & Schema Validation (Spec §5.2)', () => {
  it('loads public/data/layers.json and validates each layer with Zod', () => {
    const layersPath = path.resolve(__dirname, '../public/data/layers.json');
    expect(fs.existsSync(layersPath)).toBe(true);

    const raw = fs.readFileSync(layersPath, 'utf-8');
    const layers = JSON.parse(raw);
    expect(Array.isArray(layers)).toBe(true);
    expect(layers.length).toBeGreaterThanOrEqual(3);

    for (const layer of layers) {
      const validated = LayerSchema.parse(layer);
      expect(validated.projection).toBe('equirectangular');
      expect(validated.urlTemplate).toContain('{z}');
      expect(validated.urlTemplate).toContain('{y}');
      expect(validated.urlTemplate).toContain('{x}');
      expect(validated.provenance).toBe('NASA-DERIVED');
    }

    const viking = layers.find((l: any) => l.id === 'viking-color');
    expect(viking).toBeDefined();
    expect(viking.kind).toBe('satellite');

    const molaShade = layers.find((l: any) => l.id === 'mola-shaded-relief');
    expect(molaShade).toBeDefined();
    expect(molaShade.kind).toBe('elevation');
  });

  it('confirms the offline fallback basemap exists', () => {
    const fallbackPath = path.resolve(__dirname, '../public/tiles/fallback-global.jpg');
    expect(fs.existsSync(fallbackPath)).toBe(true);
    const stats = fs.statSync(fallbackPath);
    expect(stats.size).toBeGreaterThan(5000);
  });
});
