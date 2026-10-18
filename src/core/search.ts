/**
 * MARS LANTERN — Search & Coordinate Geocoder
 * 
 * Supports:
 * - Direct coordinate inputs in decimal degrees, hemisphere notation, and West-longitude notation
 * - Fuzzy and keyword matching across checkpoints, resource types, and missions
 * 
 * Pure TypeScript — zero DOM, zero React.
 * Reference: MARS_LANTERN_SPEC.md §8.2
 */

import { clampLat, normalizeLon360, lon360ToDisplay } from './geo';
import type { Checkpoint } from './types';

export interface ParsedCoordinate {
  lat: number;
  lonE: number;
  displayLon: number;
  formatted: string;
}

export interface SearchResult {
  type: 'coordinate' | 'checkpoint' | 'resource_match';
  score: number;
  title: string;
  subtitle: string;
  lat: number;
  lonE: number;
  checkpointId?: string;
  checkpoint?: Checkpoint;
}

/**
 * Parses user coordinate text input into a standardized planetocentric coordinate.
 * Accepts:
 * - "18.44, 77.45"
 * - "-4.59, 137.44"
 * - "18.44N 77.45E", "18.44°N, 77.45°E", "18.44 N 77.45 E"
 * - "18.44°N 282.55°W" (West longitude converted to East: 360 - 282.55 = 77.45°E)
 * - "18.65, -133.8" (Display longitude -133.8° converted to 226.2°E)
 */
export function parseCoordinateInput(input: string): ParsedCoordinate | null {
  if (!input || typeof input !== 'string') return null;
  const text = input.trim();
  if (text.length < 3) return null;

  // Pattern 1: Hemisphere letter notation, e.g. "18.44°N 77.45°E" or "18.44N, 282.55W"
  const hemiRegex = /^([+-]?\d+(?:\.\d+)?)\s*°?\s*([NSns])\s*[,;\s/]+\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*([EWew])$/;
  const hemiMatch = text.match(hemiRegex);

  if (hemiMatch) {
    const rawLat = parseFloat(hemiMatch[1]);
    const latHemi = hemiMatch[2].toUpperCase();
    const rawLon = parseFloat(hemiMatch[3]);
    const lonHemi = hemiMatch[4].toUpperCase();

    if (!Number.isFinite(rawLat) || !Number.isFinite(rawLon)) return null;

    const lat = clampLat(latHemi === 'S' ? -Math.abs(rawLat) : Math.abs(rawLat));
    let lonE = lonHemi === 'W' ? (360 - (rawLon % 360)) % 360 : rawLon;
    lonE = normalizeLon360(lonE);

    return {
      lat: parseFloat(lat.toFixed(5)),
      lonE: parseFloat(lonE.toFixed(5)),
      displayLon: parseFloat(lon360ToDisplay(lonE).toFixed(5)),
      formatted: `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${lonE.toFixed(4)}°E`
    };
  }

  // Pattern 2: Decimal pair notation, e.g. "18.44, 77.45" or "-4.59 137.44" or "18.65, -133.8"
  const decRegex = /^([+-]?\d+(?:\.\d+)?)\s*°?\s*[,;\s/]+\s*([+-]?\d+(?:\.\d+)?)\s*°?$/;
  const decMatch = text.match(decRegex);

  if (decMatch) {
    const rawLat = parseFloat(decMatch[1]);
    const rawLon = parseFloat(decMatch[2]);

    if (!Number.isFinite(rawLat) || !Number.isFinite(rawLon)) return null;
    if (rawLat < -90 || rawLat > 90) return null;

    const lat = clampLat(rawLat);
    const lonE = normalizeLon360(rawLon);

    return {
      lat: parseFloat(lat.toFixed(5)),
      lonE: parseFloat(lonE.toFixed(5)),
      displayLon: parseFloat(lon360ToDisplay(lonE).toFixed(5)),
      formatted: `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${lonE.toFixed(4)}°E`
    };
  }

  return null;
}

/**
 * Calculates a simple string similarity score between query and target (0.0 to 1.0).
 */
function scoreMatch(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (!q || !t) return 0;
  if (t === q) return 1.0;
  if (t.startsWith(q)) return 0.85;
  if (t.includes(q)) return 0.65;

  // Token match score
  const qTokens = q.split(/\s+/).filter(Boolean);
  const tTokens = t.split(/\s+/).filter(Boolean);
  let matched = 0;
  for (const qTok of qTokens) {
    if (tTokens.some((tTok) => tTok.includes(qTok) || qTok.includes(tTok))) {
      matched += 1;
    }
  }
  return qTokens.length > 0 ? (matched / qTokens.length) * 0.5 : 0;
}

/**
 * Searches a checkpoint catalog using coordinate parsing or keyword fuzzy matching.
 */
export function searchLocations(
  query: string,
  catalog: Checkpoint[],
  limit: number = 8
): SearchResult[] {
  if (!query || typeof query !== 'string') return [];
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const results: SearchResult[] = [];

  // 1. Try coordinate parsing first
  const coord = parseCoordinateInput(cleanQuery);
  if (coord) {
    results.push({
      type: 'coordinate',
      score: 1.0,
      title: coord.formatted,
      subtitle: `Planetary Coordinates (Lon ${coord.displayLon}° display)`,
      lat: coord.lat,
      lonE: coord.lonE
    });
  }

  // 2. Search catalog checkpoints
  const lowerQuery = cleanQuery.toLowerCase();
  for (const cp of catalog) {
    let bestScore = scoreMatch(cleanQuery, cp.name);

    // Also match summary, id, rover, kind
    if (cp.id.toLowerCase().includes(lowerQuery)) {
      bestScore = Math.max(bestScore, 0.7);
    }
    if (cp.rover && cp.rover.toLowerCase().includes(lowerQuery)) {
      bestScore = Math.max(bestScore, 0.75);
    }
    if (cp.kind.toLowerCase().includes(lowerQuery)) {
      bestScore = Math.max(bestScore, 0.6);
    }

    // Match resource types (e.g. typing "ice" finds water_ice sites)
    let resourceHit = '';
    for (const res of cp.resources || []) {
      if (res.type.toLowerCase().includes(lowerQuery) || res.detail.toLowerCase().includes(lowerQuery)) {
        bestScore = Math.max(bestScore, 0.8);
        resourceHit = res.type.replace('_', ' ');
      }
    }

    if (bestScore > 0.25) {
      results.push({
        type: resourceHit ? 'resource_match' : 'checkpoint',
        score: bestScore,
        title: cp.name,
        subtitle: resourceHit
          ? `Resource: ${resourceHit.toUpperCase()} • ${cp.kind}`
          : `${cp.kind.replace('_', ' ').toUpperCase()} • Lat ${cp.lat.toFixed(2)}°, Lon ${cp.lonE.toFixed(2)}°E`,
        lat: cp.lat,
        lonE: cp.lonE,
        checkpointId: cp.id,
        checkpoint: cp
      });
    }
  }

  // Sort by score descending and take top N
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
