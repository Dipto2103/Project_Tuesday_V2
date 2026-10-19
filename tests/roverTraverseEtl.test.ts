import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parsePdsLabel, parsePdsTable, extractRoverRecords } from '../src/core/rovers/pdsParser';
import {
  TraverseIndexEntrySchema,
  TrackPointsSchema,
  MilestoneSchema
} from '../src/core/rovers/types';
import { haversineKm } from '../src/core/geo';

describe('Phase R6 — PDS Parser, Traverse ETL & Calibration Gates', () => {
  it('parses real PDS3 label column definitions dynamically from fixture', () => {
    const lblPath = path.resolve(process.cwd(), 'tests/fixtures/pds_places_sample.lbl');
    const labelContent = fs.readFileSync(lblPath, 'utf-8');
    const label = parsePdsLabel(labelContent);

    expect(label.interchangeFormat).toBe('ASCII');
    expect(label.columns.length).toBe(7);

    // Verify column definitions
    const colNames = label.columns.map(c => c.name);
    expect(colNames).toEqual([
      'SOL',
      'SITE',
      'DRIVE',
      'LATITUDE',
      'LONGITUDE',
      'ELEVATION',
      'ODOMETRY'
    ]);

    expect(label.columns[0].dataType).toBe('ASCII_INTEGER');
    expect(label.columns[3].dataType).toBe('ASCII_REAL');
    expect(label.columns[3].units).toBe('DEGREE');
  });

  it('parses fixed-width table data using parsed PDS label definitions', () => {
    const lblPath = path.resolve(process.cwd(), 'tests/fixtures/pds_places_sample.lbl');
    const tabPath = path.resolve(process.cwd(), 'tests/fixtures/pds_places_sample.tab');
    const label = parsePdsLabel(fs.readFileSync(lblPath, 'utf-8'));
    const rows = parsePdsTable(fs.readFileSync(tabPath, 'utf-8'), label);

    expect(rows.length).toBe(5);
    expect(rows[0]['SOL']).toBe(0);
    expect(rows[0]['SITE']).toBe(1);
    expect(rows[0]['DRIVE']).toBe(0);
    expect(rows[0]['LATITUDE']).toBeCloseTo(-4.5895, 4);
    expect(rows[0]['LONGITUDE']).toBeCloseTo(137.4417, 4);
    expect(rows[0]['ELEVATION']).toBeCloseTo(-4501.0, 1);
    expect(rows[0]['ODOMETRY']).toBeCloseTo(0.0, 1);

    expect(rows[4]['SOL']).toBe(125);
    expect(rows[4]['ODOMETRY']).toBeCloseTo(1042.8, 1);

    // Extract structured rover records
    const records = extractRoverRecords(rows);
    expect(records.length).toBe(5);
    expect(records[0].sol).toBe(0);
    expect(records[4].sol).toBe(125);
    expect(records[0].lonE).toBeGreaterThan(0);
  });

  it('validates generated Curiosity & Perseverance track files against Zod schemas', () => {
    const indexPath = path.resolve(process.cwd(), 'public/data/tracks/index.json');
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    expect(Array.isArray(indexData)).toBe(true);

    for (const entry of indexData) {
      const parsed = TraverseIndexEntrySchema.safeParse(entry);
      expect(parsed.success).toBe(true);
    }

    const cPointsPath = path.resolve(process.cwd(), 'public/data/tracks/curiosity.points.json');
    const cPoints = JSON.parse(fs.readFileSync(cPointsPath, 'utf-8'));
    const parsedCPoints = TrackPointsSchema.safeParse(cPoints);
    expect(parsedCPoints.success).toBe(true);
    expect(cPoints.sol.length).toBeGreaterThan(500);

    const pPointsPath = path.resolve(process.cwd(), 'public/data/tracks/perseverance.points.json');
    const pPoints = JSON.parse(fs.readFileSync(pPointsPath, 'utf-8'));
    const parsedPPoints = TrackPointsSchema.safeParse(pPoints);
    expect(parsedPPoints.success).toBe(true);
    expect(pPoints.sol.length).toBeGreaterThan(200);
  });

  it('verifies odometry and sol are strictly non-decreasing (monotonicity check)', () => {
    for (const rover of ['curiosity', 'perseverance']) {
      const pointsPath = path.resolve(process.cwd(), `public/data/tracks/${rover}.points.json`);
      const points = JSON.parse(fs.readFileSync(pointsPath, 'utf-8'));

      for (let i = 1; i < points.sol.length; i++) {
        expect(points.sol[i]).toBeGreaterThanOrEqual(points.sol[i - 1]);
        expect(points.odomKm[i]).toBeGreaterThanOrEqual(points.odomKm[i - 1]);
      }
    }
  });

  it('satisfies Spec §10.5 calibration gates: landing site proximity < 5 km', () => {
    // 1. Curiosity first record vs Bradbury Landing (-4.5895°, 137.4417°E)
    const cPoints = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'public/data/tracks/curiosity.points.json'), 'utf-8')
    );
    const cFirstDist = haversineKm(
      { lat: cPoints.lat[0], lonE: cPoints.lonE[0] },
      { lat: -4.5895, lonE: 137.4417 }
    );
    expect(cFirstDist).toBeLessThan(5.0);

    // 2. Perseverance first record vs Jezero Octavia E. Butler Landing (18.4447°, 77.4508°E)
    const pPoints = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'public/data/tracks/perseverance.points.json'), 'utf-8')
    );
    const pFirstDist = haversineKm(
      { lat: pPoints.lat[0], lonE: pPoints.lonE[0] },
      { lat: 18.4447, lonE: 77.4508 }
    );
    expect(pFirstDist).toBeLessThan(5.0);
  });

  it('validates milestone seeds against Zod schema and bounding boxes', () => {
    const indexPath = path.resolve(process.cwd(), 'public/data/tracks/index.json');
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    const curIndex = indexData.find((x: any) => x.rover === 'Curiosity');

    const cMilestones = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'public/data/milestones/curiosity.json'), 'utf-8')
    );
    expect(cMilestones.length).toBeGreaterThanOrEqual(8);

    for (const m of cMilestones) {
      const parsed = MilestoneSchema.safeParse(m);
      expect(parsed.success).toBe(true);
      expect(m.geology.length).toBeGreaterThan(10);
      expect(m.whyItMatters.length).toBeGreaterThan(10);

      // Verify coordinate lies within rover bounding box ±5 km (~0.08°)
      if (m.lat !== null && m.lonE !== null && curIndex) {
        expect(m.lat).toBeGreaterThanOrEqual(curIndex.bbox[1] - 0.1);
        expect(m.lat).toBeLessThanOrEqual(curIndex.bbox[3] + 0.1);
      }
    }
  });
});
