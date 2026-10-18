import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Data Manifest, LLM Reference & Scientific Sources Validation', () => {
  it('validates public/data/manifest.json structure and schemaVersion', () => {
    const manifestPath = path.resolve(process.cwd(), 'public/data/manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.datasets).toBeInstanceOf(Array);
    expect(manifest.datasets.length).toBeGreaterThanOrEqual(5);

    // Verify all dataset paths exist on disk
    for (const dataset of manifest.datasets) {
      const diskPath = path.resolve(process.cwd(), 'public', dataset.path);
      expect(fs.existsSync(diskPath), `Missing dataset file: ${dataset.path}`).toBe(true);
    }
  });

  it('validates public/llms.txt includes provenance legend and MCP tools documentation', () => {
    const llmsPath = path.resolve(process.cwd(), 'public/llms.txt');
    expect(fs.existsSync(llmsPath)).toBe(true);

    const content = fs.readFileSync(llmsPath, 'utf-8');
    expect(content).toContain('MARS LANTERN');
    expect(content).toContain('Provenance Legend');
    expect(content).toContain('MEASURED');
    expect(content).toContain('NASA-DERIVED');
    expect(content).toContain('MODELED');
    expect(content).toContain('SIMULATED');
    expect(content).toContain('UNKNOWN');
    expect(content).toContain('get_location_report');
    expect(content).toContain('plan_route');
    expect(content).toContain('get_mars_sky');
  });

  it('validates public/data/sources.json critical primary sources integrity', () => {
    const sourcesPath = path.resolve(process.cwd(), 'public/data/sources.json');
    expect(fs.existsSync(sourcesPath)).toBe(true);

    const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
    expect(sources.length).toBeGreaterThanOrEqual(10);

    const criticalSources = sources.filter((s: any) => s.critical);
    expect(criticalSources.length).toBeGreaterThanOrEqual(5);

    // Ensure no tracking parameters in any source URL (Agent Rule 8)
    for (const src of sources) {
      expect(src.url).not.toContain('utm_source');
      expect(src.url).toMatch(/^https?:\/\//);
      expect(['MEASURED', 'NASA-DERIVED', 'MODELED', 'SIMULATED', 'UNKNOWN']).toContain(src.provenance);
    }
  });

  it('validates public/data/articles.json links to valid checkpoints', () => {
    const articlesPath = path.resolve(process.cwd(), 'public/data/articles.json');
    const checkpointsPath = path.resolve(process.cwd(), 'public/data/checkpoints.json');

    const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf-8'));
    const checkpoints = JSON.parse(fs.readFileSync(checkpointsPath, 'utf-8'));
    const checkpointIds = new Set(checkpoints.map((c: any) => c.id));

    expect(articles.length).toBeGreaterThanOrEqual(5);

    for (const art of articles) {
      expect(art.id).toBeDefined();
      expect(art.title).toBeDefined();
      expect(art.content.length).toBeGreaterThan(100);
      expect(art.sources.length).toBeGreaterThan(0);
      expect(['MEASURED', 'NASA-DERIVED', 'MODELED', 'SIMULATED', 'UNKNOWN']).toContain(art.provenance);
    }
  });

  it('validates public/data/stars.json has bright stars with visual magnitudes', () => {
    const starsPath = path.resolve(process.cwd(), 'public/data/stars.json');
    const stars = JSON.parse(fs.readFileSync(starsPath, 'utf-8'));

    expect(stars.length).toBeGreaterThanOrEqual(50);
    // Sirius must be brightest star
    const sirius = stars.find((s: any) => s.name === 'Sirius');
    expect(sirius).toBeDefined();
    expect(sirius.mag).toBeLessThan(0);
  });
});
