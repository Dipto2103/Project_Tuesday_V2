/**
 * MARS LANTERN — Planetary Data Models & Schemas (Zod Validated)
 * 
 * Strict typing and runtime schema validation for checkpoints, resources,
 * provenance badges, mission planning, and location reports.
 * 
 * Pure TypeScript — zero React, zero DOM. Shared between web app and MCP server.
 * Reference: MARS_LANTERN_SPEC.md §6.1, §8.8, §9.2
 */

import { z } from 'zod';

export const PROVENANCE_VALUES = [
  'MEASURED',
  'NASA-DERIVED',
  'MODELED',
  'SIMULATED',
  'UNKNOWN'
] as const;

export const ProvenanceSchema = z.enum(PROVENANCE_VALUES);
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const RESOURCE_TYPES = [
  'water_ice',
  'hydrated_minerals',
  'clay_minerals',
  'sulfates',
  'iron_oxides',
  'basaltic_regolith',
  'volcanic',
  'carbonates',
  'co2_atmosphere',
  'metals_meteorite'
] as const;

export const ResourceTypeSchema = z.enum(RESOURCE_TYPES);
export type ResourceType = z.infer<typeof ResourceTypeSchema>;

export const CHECKPOINT_KINDS = [
  'landing_site',
  'resource_zone',
  'science_site',
  'hazard',
  'landmark'
] as const;

export const CheckpointKindSchema = z.enum(CHECKPOINT_KINDS);
export type CheckpointKind = z.infer<typeof CheckpointKindSchema>;

export const COORD_CONFIDENCE_VALUES = ['exact', 'approx', 'region'] as const;
export const CoordConfidenceSchema = z.enum(COORD_CONFIDENCE_VALUES);
export type CoordConfidence = z.infer<typeof CoordConfidenceSchema>;

export const COORD_SOURCE_VALUES = ['project-pdf', 'nasa-page', 'memory-verify'] as const;
export const CoordSourceSchema = z.enum(COORD_SOURCE_VALUES);
export type CoordSource = z.infer<typeof CoordSourceSchema>;

export const ROVER_NAMES = [
  'Curiosity',
  'Perseverance',
  'Opportunity',
  'Spirit',
  'Viking',
  'Phoenix',
  'InSight',
  'Pathfinder'
] as const;
export const RoverNameSchema = z.enum(ROVER_NAMES);
export type RoverName = z.infer<typeof RoverNameSchema>;

export const ResourceEntrySchema = z.object({
  type: ResourceTypeSchema,
  detail: z.string(),
  quantity: z.string().optional(),
  provenance: ProvenanceSchema
});
export type ResourceEntry = z.infer<typeof ResourceEntrySchema>;

export const HazardEntrySchema = z.object({
  label: z.string(),
  detail: z.string(),
  provenance: ProvenanceSchema
});
export type HazardEntry = z.infer<typeof HazardEntrySchema>;

export const SurfaceFactSchema = z.object({
  label: z.string(),
  value: z.string(),
  unit: z.string().optional(),
  provenance: ProvenanceSchema
});
export type SurfaceFact = z.infer<typeof SurfaceFactSchema>;

export const SourceLinkSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  retrieved: z.string().optional()
});
export type SourceLink = z.infer<typeof SourceLinkSchema>;

export const CheckpointSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: CheckpointKindSchema,
  lat: z.number().min(-90).max(90),
  lonE: z.number().min(0).max(360),
  coordConfidence: CoordConfidenceSchema,
  coordSource: CoordSourceSchema,
  radiusKm: z.number().positive().optional(),
  resources: z.array(ResourceEntrySchema).default([]),
  hazards: z.array(HazardEntrySchema).optional(),
  surfaceFacts: z.array(SurfaceFactSchema).optional(),
  rover: RoverNameSchema.optional(),
  summary: z.string(),
  sources: z.array(SourceLinkSchema).default([]),
  fieldManualSlug: z.string().optional()
});
export type Checkpoint = z.infer<typeof CheckpointSchema>;

// Map Layer Definition (Spec §5.2)
export const LayerKindSchema = z.enum([
  'satellite',
  'elevation',
  'slope',
  'geology',
  'polar'
]);
export type LayerKind = z.infer<typeof LayerKindSchema>;

export const LayerSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: LayerKindSchema,
  urlTemplate: z.string(),
  tileSize: z.number().default(256),
  minZoom: z.number().default(0),
  maxNativeZoom: z.number().default(7),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  projection: z.literal('equirectangular'),
  attribution: z.string(),
  provenance: ProvenanceSchema.default('NASA-DERIVED'),
  verifiedOn: z.string().optional(),
  active: z.boolean().default(false),
  opacity: z.number().min(0).max(1).default(1.0)
});
export type Layer = z.infer<typeof LayerSchema>;

// Location Report Schemas (Spec §8.8)
export const ResourceHitSchema = z.object({
  checkpointId: z.string(),
  name: z.string(),
  distanceKm: z.number(),
  resourceType: ResourceTypeSchema,
  detail: z.string(),
  quantity: z.string().optional(),
  provenance: ProvenanceSchema
});
export type ResourceHit = z.infer<typeof ResourceHitSchema>;

export const HazardHitSchema = z.object({
  checkpointId: z.string(),
  name: z.string(),
  distanceKm: z.number(),
  label: z.string(),
  detail: z.string(),
  severity: z.enum(['low', 'moderate', 'high', 'critical']),
  provenance: ProvenanceSchema
});
export type HazardHit = z.infer<typeof HazardHitSchema>;

export const RouteSummarySchema = z.object({
  fromId: z.string(),
  toId: z.string(),
  distanceKm: z.number(),
  durationHours: z.number(),
  maxSlopeDeg: z.number(),
  highResCoveragePct: z.number(),
  passSlopeLimit: z.boolean(),
  status: z.enum(['FEASIBLE', 'HIGH_RISK', 'IMPASSABLE', 'INSUFFICIENT_DATA'])
});
export type RouteSummary = z.infer<typeof RouteSummarySchema>;

export const SkySnapshotSchema = z.object({
  marsYear: z.number(),
  lsDeg: z.number(),
  season: z.string(),
  sol: z.number(),
  ltst: z.string(),
  sunElevationDeg: z.number(),
  sunAzimuthDeg: z.number(),
  daylightHours: z.number(),
  isDaylight: z.boolean(),
  earthElongationDeg: z.number(),
  phobosVisible: z.boolean(),
  deimosVisible: z.boolean(),
  provenance: ProvenanceSchema.default('NASA-DERIVED')
});
export type SkySnapshot = z.infer<typeof SkySnapshotSchema>;

export const LocationReportSchema = z.object({
  query: z.string(),
  lat: z.number(),
  lonE: z.number(),
  lonDisplay: z.number(),
  nearestFeature: z
    .object({
      id: z.string(),
      name: z.string(),
      distanceKm: z.number()
    })
    .nullable(),
  elevationM: z.object({
    value: z.number().nullable(),
    provenance: ProvenanceSchema,
    resolution: z.enum(['global_8ppd', 'regional_128ppd', 'none'])
  }),
  slopeDeg: z.number().nullable(),
  roughnessM: z.number().nullable(),
  terrain: z.object({
    quality: z.number().nullable(),
    class: z.string(),
    terms: z.record(z.string(), z.number()),
    assumptions: z.array(z.string())
  }),
  temperature: z.object({
    minC: z.number(),
    maxC: z.number(),
    meanC: z.number(),
    uncertaintyK: z.number(),
    provenance: z.literal('MODELED'),
    anchors: z.array(z.any()).default([])
  }),
  resources: z.object({
    radiusKm: z.number(),
    items: z.array(ResourceHitSchema),
    zones: z.array(z.string())
  }),
  hazards: z.array(HazardHitSchema),
  routes: z.array(RouteSummarySchema),
  sky: SkySnapshotSchema,
  imagery: z.object({
    layerIds: z.array(z.string()),
    nasaImages: z.array(z.any()).default([])
  }),
  dataConfidence: z.enum(['high', 'medium', 'low', 'unknown']),
  generatedAt: z.string()
});
export type LocationReport = z.infer<typeof LocationReportSchema>;

// Mission Plan Schema (Spec §9.2)
export const MissionVehicleSchema = z.enum([
  'eva',
  'rover_unpressurised',
  'rover_pressurised'
]);
export type MissionVehicle = z.infer<typeof MissionVehicleSchema>;

export const MissionPlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string(),
  schemaVersion: z.literal(1),
  start: z.object({
    lat: z.number(),
    lonE: z.number(),
    label: z.string()
  }),
  stops: z.array(
    z.object({
      checkpointId: z.string().optional(),
      lat: z.number(),
      lonE: z.number(),
      label: z.string(),
      objectives: z.array(z.string())
    })
  ),
  vehicle: MissionVehicleSchema,
  crew: z.number().min(1),
  durationSols: z.number().min(0.1),
  reservePct: z.number().min(0),
  equipment: z.array(
    z.object({
      id: z.string(),
      qty: z.number().min(1)
    })
  ),
  legs: z.array(RouteSummarySchema).default([]),
  schedule: z.array(z.any()).default([]),
  budget: z.record(z.string(), z.any()).default({}),
  feasibility: z.object({
    overall: z.enum([
      'FEASIBLE UNDER ASSUMPTIONS',
      'FEASIBLE WITH WARNINGS',
      'INFEASIBLE',
      'INSUFFICIENT DATA'
    ]),
    resourceVerdict: z.string(),
    terrainVerdict: z.string(),
    scheduleVerdict: z.string(),
    dataCoverageVerdict: z.string(),
    reasons: z.array(z.string()),
    recommendations: z.array(z.string())
  }),
  assumptions: z.record(z.string(), z.union([z.number(), z.string()])).default({})
});
export type MissionPlan = z.infer<typeof MissionPlanSchema>;
