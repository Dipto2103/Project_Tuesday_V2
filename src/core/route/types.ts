/**
 * MARS LANTERN — Multi-Mode Route Planning Types & Zod Schemas
 * 
 * Defines universal route request, result, segment, and error types
 * with full runtime Zod validation for UI, workers, and MCP server.
 * 
 * Pure TypeScript — zero DOM, zero React.
 * Reference: MARS_LANTERN_ROUTING_ROVER_SPEC.md §8.1
 */

import { z } from 'zod';
import type { Provenance } from '../types';

export type RouteMode =
  | 'A_DIRECT'
  | 'B_TERRAIN_ASTAR'
  | 'C_ROVER_REFERENCE'
  | 'A'
  | 'B'
  | 'B_SHORTEST'
  | 'B_SAFEST'
  | 'C';
export type SegmentFlag = 'OK' | 'CAUTION' | 'STEEP' | 'NO_DATA' | 'HAZARD' | 'UNVERIFIED';
export type Vehicle = 'eva' | 'rover_unpressurised' | 'rover_pressurised';
export type VehicleType = Vehicle;

export interface LatLonE {
  lat: number;
  lonE: number;
}

export interface RouteRequest {
  mode: RouteMode;
  from: LatLonE;
  to: LatLonE;
  vehicle: Vehicle;
  riskTolerant?: boolean;                         // Mode B only
  referenceRover?: 'Curiosity' | 'Perseverance';  // Mode C only
  assumptions: Record<string, number>;            // snapshot of weights/limits used (reproducibility)
}

export interface RouteSegment {
  a: LatLonE;
  b: LatLonE;
  lengthKm: number;
  slopeDeg: number | null;
  flag: SegmentFlag;
  elevationM?: number | null;
}

export interface RouteResult {
  mode: RouteMode;
  ok: true;
  geometry: LatLonE[];
  segments: RouteSegment[];
  distanceKm: number;
  straightLineKm: number;
  detourRatio: number;                            // distanceKm / straightLineKm
  climbM: number;
  descentM: number;
  maxSlopeDeg: number | null;
  meanSlopeDeg: number | null;
  dataCoveragePct: number;                        // % length on valid regional data
  noDataPct: number;
  passesSlopeLimit: boolean | 'UNKNOWN';
  timeHours: number | null;                       // from vehicle speed assumption; null for Mode A
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED';
  warnings: string[];                             // always includes mode's mandatory warnings
  provenance: Provenance;                         // A: MODELED, B: MODELED, C: NASA-DERIVED + MODELED metrics
  assumptionsUsed: Record<string, number | string>;
  computedAt: string;
  initialBearingDeg?: number;
  finalBearingDeg?: number;
}

export interface RouteError {
  mode: RouteMode;
  ok: false;
  error: 'NO_ROUTE' | 'OUT_OF_BOUNDS' | 'NO_DATA' | 'NO_REFERENCE_TRAVERSE';
  reason: string;
}

// --- Zod Runtime Validation Schemas ---

export const LatLonESchema = z.object({
  lat: z.number().min(-90).max(90),
  lonE: z.number().min(0).max(360)
});

export const RouteRequestSchema = z.object({
  mode: z.enum(['A_DIRECT', 'B_TERRAIN_ASTAR', 'C_ROVER_REFERENCE']),
  from: LatLonESchema,
  to: LatLonESchema,
  vehicle: z.enum(['eva', 'rover_unpressurised', 'rover_pressurised']),
  riskTolerant: z.boolean().optional(),
  referenceRover: z.enum(['Curiosity', 'Perseverance']).optional(),
  assumptions: z.record(z.string(), z.number())
});

export const RouteSegmentSchema = z.object({
  a: LatLonESchema,
  b: LatLonESchema,
  lengthKm: z.number().nonnegative(),
  slopeDeg: z.number().nullable(),
  flag: z.enum(['OK', 'CAUTION', 'STEEP', 'NO_DATA', 'HAZARD', 'UNVERIFIED']),
  elevationM: z.number().nullable().optional()
});

export const RouteResultSchema = z.object({
  mode: z.enum(['A_DIRECT', 'B_TERRAIN_ASTAR', 'C_ROVER_REFERENCE']),
  ok: z.literal(true),
  geometry: z.array(LatLonESchema),
  segments: z.array(RouteSegmentSchema),
  distanceKm: z.number().nonnegative(),
  straightLineKm: z.number().nonnegative(),
  detourRatio: z.number().nonnegative(),
  climbM: z.number(),
  descentM: z.number(),
  maxSlopeDeg: z.number().nullable(),
  meanSlopeDeg: z.number().nullable(),
  dataCoveragePct: z.number().min(0).max(100),
  noDataPct: z.number().min(0).max(100),
  passesSlopeLimit: z.union([z.boolean(), z.literal('UNKNOWN')]),
  timeHours: z.number().nullable(),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW', 'UNVERIFIED']),
  warnings: z.array(z.string()),
  provenance: z.enum(['MEASURED', 'NASA-DERIVED', 'MODELED', 'SIMULATED', 'UNKNOWN']),
  assumptionsUsed: z.record(z.string(), z.union([z.number(), z.string()])),
  computedAt: z.string(),
  initialBearingDeg: z.number().optional(),
  finalBearingDeg: z.number().optional()
});

export const RouteErrorSchema = z.object({
  mode: z.enum(['A_DIRECT', 'B_TERRAIN_ASTAR', 'C_ROVER_REFERENCE']),
  ok: z.literal(false),
  error: z.enum(['NO_ROUTE', 'OUT_OF_BOUNDS', 'NO_DATA', 'NO_REFERENCE_TRAVERSE']),
  reason: z.string()
});
