import { z } from 'zod';

export type RoverName = 'Curiosity' | 'Perseverance';

export interface TraverseIndexEntry {
  rover: RoverName;
  density: 'dense' | 'sparse';
  solMin: number;
  solMax: number;
  odometryKm: number;
  records: number;
  bbox: [number, number, number, number]; // [west, south, east, north] display lon
  source: {
    title: string;
    url: string;
    datasetId?: string;
    retrieved: string;
  };
  provenance: 'NASA-DERIVED';
  etlVersion: string;
}

export interface TrackPoints {
  sol: number[];
  lat: number[];
  lonE: number[];
  elevM: (number | null)[];
  odomKm: number[];
}

export type MilestoneCategory =
  | 'landing'
  | 'science_site'
  | 'sample'
  | 'drive_record'
  | 'hazard'
  | 'instrument'
  | 'other';

export interface Milestone {
  id: string;
  rover: RoverName;
  sol: number;
  earthDate?: string;
  name: string;
  category: MilestoneCategory;
  lat: number | null;
  lonE: number | null;
  coordSource: 'pds-track' | 'nasa-page' | 'memory-verify';
  elevationM: number | null;
  elevationSource?: 'pds' | 'mola' | 'nasa-page';
  geology: string;
  whyItMatters: string;
  sources: { title: string; url: string }[];
  verify?: boolean;
}

// Zod Schemas for Runtime Validation and Serialization
export const TraverseIndexEntrySchema = z.object({
  rover: z.enum(['Curiosity', 'Perseverance']),
  density: z.enum(['dense', 'sparse']),
  solMin: z.number(),
  solMax: z.number(),
  odometryKm: z.number(),
  records: z.number(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  source: z.object({
    title: z.string(),
    url: z.string().url(),
    datasetId: z.string().optional(),
    retrieved: z.string()
  }),
  provenance: z.literal('NASA-DERIVED'),
  etlVersion: z.string()
});

export const TrackPointsSchema = z.object({
  sol: z.array(z.number()),
  lat: z.array(z.number()),
  lonE: z.array(z.number()),
  elevM: z.array(z.number().nullable()),
  odomKm: z.array(z.number())
});

export const MilestoneSchema = z.object({
  id: z.string(),
  rover: z.enum(['Curiosity', 'Perseverance']),
  sol: z.number(),
  earthDate: z.string().optional(),
  name: z.string(),
  category: z.enum([
    'landing',
    'science_site',
    'sample',
    'drive_record',
    'hazard',
    'instrument',
    'other'
  ]),
  lat: z.number().nullable(),
  lonE: z.number().nullable(),
  coordSource: z.enum(['pds-track', 'nasa-page', 'memory-verify']),
  elevationM: z.number().nullable(),
  elevationSource: z.enum(['pds', 'mola', 'nasa-page']).optional(),
  geology: z.string().max(350),
  whyItMatters: z.string(),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string()
  })),
  verify: z.boolean().optional()
});
