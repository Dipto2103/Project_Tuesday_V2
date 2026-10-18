/**
 * MARS LANTERN — Model Context Protocol (MCP) Server
 * Complies with MARS_LANTERN_SPEC.md §14.2
 * 
 * Exposes deterministic Martian science, cartography, ephemeris, and routing
 * algorithms directly to AI agents via standard stdio transport.
 * 
 * Run directly with: npx tsx mcp/server.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { getLocationReport, resourcesNear, hazardsNear } from '../src/core/report';
import { parseCoordinateQuery, searchCheckpoints } from '../src/core/search';
import { planMarsRoute } from '../src/core/route';
import { evaluateMission, type MissionPlan } from '../src/core/mission/evaluation';
import { calculateMarsSky } from '../src/core/sky/mars24';
import { normalizeLon360, haversineKm } from '../src/core/geo';
import type { Checkpoint } from '../src/core/types';

// Load checkpoints from public/data/checkpoints.json
function loadCatalog(): Checkpoint[] {
  const filePath = path.resolve(process.cwd(), 'public/data/checkpoints.json');
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return [];
}

const catalog = loadCatalog();

const server = new McpServer({
  name: 'mars-lantern',
  version: '1.0.0'
});

// Tool 1: list_checkpoints
server.tool(
  'list_checkpoints',
  'List planetary checkpoints, landing sites, resource zones, and hazards on Mars with optional filters.',
  {
    resourceType: z.string().optional().describe('Filter by resource type (e.g. water_ice, clay_minerals, basaltic_regolith, sulfates)'),
    kind: z.enum(['landing_site', 'resource_zone', 'science_site', 'hazard', 'landmark']).optional().describe('Filter by checkpoint category'),
    minLat: z.number().optional().describe('Bounding box minimum latitude (-90 to 90)'),
    maxLat: z.number().optional().describe('Bounding box maximum latitude (-90 to 90)'),
    minLon: z.number().optional().describe('Bounding box minimum east longitude (0 to 360)'),
    maxLon: z.number().optional().describe('Bounding box maximum east longitude (0 to 360)')
  },
  async ({ resourceType, kind, minLat, maxLat, minLon, maxLon }) => {
    let results = catalog;

    if (resourceType) {
      results = results.filter((cp) => cp.resources?.some((r) => r.type === resourceType));
    }
    if (kind) {
      results = results.filter((cp) => cp.kind === kind);
    }
    if (minLat !== undefined && maxLat !== undefined) {
      results = results.filter((cp) => cp.lat >= minLat && cp.lat <= maxLat);
    }
    if (minLon !== undefined && maxLon !== undefined) {
      results = results.filter((cp) => cp.lonE >= minLon && cp.lonE <= maxLon);
    }

    const summaries = results.map((cp) => ({
      id: cp.id,
      name: cp.name,
      kind: cp.kind,
      lat: cp.lat,
      lonE: cp.lonE,
      resources: cp.resources.map((r) => `${r.type} (${r.provenance})`),
      hazards: cp.hazards?.map((h) => `${h.label} (${h.provenance})`) || [],
      summary: cp.summary
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(summaries, null, 2) }]
    };
  }
);

// Tool 2: get_location_report
server.tool(
  'get_location_report',
  'Comprehensive terrain analysis, MOLA elevation, modeled surface temperature, nearby resources, hazards, and sky conditions for any Martian coordinate or named landmark. Every metric carries explicit provenance (MEASURED, NASA-DERIVED, MODELED, SIMULATED, UNKNOWN).',
  {
    query: z.string().describe('Place name (e.g. "Jezero", "Olympus Mons") or coordinate string (e.g. "18.44, 77.45", "18.65N 226.2E")')
  },
  async ({ query }) => {
    const report = getLocationReport(query, catalog);
    return {
      content: [{ type: 'text', text: JSON.stringify(report, null, 2) }]
    };
  }
);

// Tool 3: find_resources_near
server.tool(
  'find_resources_near',
  'Find natural ISRU resources (water-ice, clays, sulfates, regolith) within a given radius of a Martian location.',
  {
    lat: z.number().describe('Latitude (-90 to 90)'),
    lonE: z.number().describe('East-positive longitude (0 to 360)'),
    radiusKm: z.number().default(500).describe('Search radius in kilometers (default 500 km)'),
    resourceType: z.string().optional().describe('Filter by specific resource type (e.g. water_ice)')
  },
  async ({ lat, lonE, radiusKm, resourceType }) => {
    const hits = resourcesNear(lat, lonE, catalog, radiusKm);
    const filtered = resourceType ? hits.filter((h) => h.type === resourceType) : hits;

    return {
      content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }]
    };
  }
);

// Tool 4: plan_route
server.tool(
  'plan_route',
  'Calculate 8-connected terrain-aware A* traverse route between two Martian points. Enforces vehicle slope limits and treats unmeasured terrain as impassable by default.',
  {
    fromLat: z.number().describe('Start point latitude'),
    fromLon: z.number().describe('Start point longitude (east-positive)'),
    toLat: z.number().describe('Destination latitude'),
    toLon: z.number().describe('Destination longitude (east-positive)'),
    vehicle: z.enum(['eva', 'rover_unpressurised', 'rover_pressurised']).default('rover_pressurised').describe('Vehicle platform'),
    riskTolerance: z.enum(['conservative', 'standard', 'risk_tolerant']).default('standard').describe('Traverse risk profile')
  },
  async ({ fromLat, fromLon, toLat, toLon, vehicle, riskTolerance }) => {
    const slopeLimit = vehicle === 'eva' ? 15 : vehicle === 'rover_unpressurised' ? 20 : 25;
    const speedKmh = vehicle === 'eva' ? 0.8 : vehicle === 'rover_unpressurised' ? 8 : 14;

    const route = planMarsRoute({
      start: { lat: fromLat, lonE: normalizeLon360(fromLon) },
      destination: { lat: toLat, lonE: normalizeLon360(toLon) },
      vehicle,
      maxSlopeDeg: slopeLimit,
      speedKmh,
      riskTolerance,
      allowUnknownTerrain: riskTolerance === 'risk_tolerant'
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(route, null, 2) }]
    };
  }
);

// Tool 5: evaluate_mission
server.tool(
  'evaluate_mission',
  'Evaluate multi-leg mission feasibility, life support consumables budget (O2, H2O, food, power), terrain risks, and schedule daylight compatibility.',
  {
    crew: z.number().min(1).max(12).default(4).describe('Crew size'),
    durationSols: z.number().min(1).max(180).default(14).describe('Mission duration in Martian sols'),
    vehicle: z.enum(['eva', 'rover_unpressurised', 'rover_pressurised']).default('rover_pressurised').describe('Traverse vehicle platform'),
    reservePct: z.number().default(20).describe('Safety reserve margin percentage (default 20%)'),
    start: z.object({
      lat: z.number(),
      lonE: z.number(),
      label: z.string()
    }).describe('Mission expedition base origin'),
    stops: z.array(z.object({
      lat: z.number(),
      lonE: z.number(),
      label: z.string(),
      objectives: z.array(z.string()).default([])
    })).describe('Array of mission waypoints and scientific stops')
  },
  async ({ crew, durationSols, vehicle, reservePct, start, stops }) => {
    const mockPlan: MissionPlan = {
      id: `mcp-mission-${Date.now()}`,
      name: 'Agent Expedition Plan',
      createdAt: new Date().toISOString(),
      schemaVersion: 1,
      start,
      stops,
      vehicle,
      crew,
      durationSols,
      reservePct,
      equipment: [],
      legs: [],
      schedule: [],
      budget: {} as any,
      feasibility: {} as any,
      assumptions: {}
    };

    const evaluation = evaluateMission(mockPlan, catalog);
    return {
      content: [{ type: 'text', text: JSON.stringify(evaluation, null, 2) }]
    };
  }
);

// Tool 6: get_mars_sky
server.tool(
  'get_mars_sky',
  'Calculate Mars24 areocentric solar longitude (Ls), seasonal solar declination, Local True Solar Time (LTST), daylight length, and Phobos/Deimos visibility at any Martian position.',
  {
    lat: z.number().describe('Observer latitude (-90 to 90)'),
    lonE: z.number().describe('Observer east longitude (0 to 360)'),
    timestampUtc: z.string().optional().describe('ISO-8601 UTC timestamp (defaults to current time)')
  },
  async ({ lat, lonE, timestampUtc }) => {
    const date = timestampUtc ? new Date(timestampUtc) : new Date();
    const sky = calculateMarsSky(date, lat, lonE);
    return {
      content: [{ type: 'text', text: JSON.stringify(sky, null, 2) }]
    };
  }
);

// Tool 7: search_nasa_images
server.tool(
  'search_nasa_images',
  'Search the NASA Planetary Image and Video Library for imagery matching a location or rover name.',
  {
    query: z.string().describe('Search query (e.g. "Jezero Crater", "Curiosity Rover")')
  },
  async ({ query }) => {
    const apiUrl = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query + ' Mars')}&media_type=image`;
    try {
      const res = await fetch(apiUrl);
      if (res.ok) {
        const json = await res.json();
        const items = (json?.collection?.items || []).slice(0, 5).map((it: any) => ({
          title: it.data?.[0]?.title,
          description: it.data?.[0]?.description,
          date: it.data?.[0]?.date_created,
          credit: it.data?.[0]?.secondary_creator || it.data?.[0]?.center,
          thumbnailUrl: it.links?.[0]?.href
        }));
        return {
          content: [{ type: 'text', text: JSON.stringify({ origin: 'live', items }, null, 2) }]
        };
      }
    } catch {
      // Fallback to local default fixture
    }

    const fixturePath = path.resolve(process.cwd(), 'public/data/fixtures/nasa_images_default.json');
    if (fs.existsSync(fixturePath)) {
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      const items = (fixture?.collection?.items || []).slice(0, 5).map((it: any) => ({
        title: it.data?.[0]?.title,
        description: it.data?.[0]?.description,
        date: it.data?.[0]?.date_created,
        credit: it.data?.[0]?.secondary_creator,
        thumbnailUrl: it.links?.[0]?.href
      }));
      return {
        content: [{ type: 'text', text: JSON.stringify({ origin: 'fixture', items }, null, 2) }]
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ origin: 'none', items: [] }) }]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MARS LANTERN] MCP Server running on stdio');
}

main().catch((err) => {
  console.error('[MARS LANTERN] MCP Server fatal error:', err);
  process.exit(1);
});
