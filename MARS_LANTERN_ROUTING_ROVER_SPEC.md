# MARS LANTERN — Upgrade Spec: Martian Explorer · Terrain Intelligence · Multi-Mode Routing · Rover Intelligence
**Companion to:** `MARS_LANTERN_SPEC.md` v1.0 (this file extends §3–§5, §8, §9.4; it does not replace them)
**Challenge:** NASA Space Apps 2026 — *Interplanetary Survival Guide: Martian Map*
**Document version:** 1.1 · target: Antigravity IDE agent working in the existing repo

> **How to use.** Put this file in the repo root next to `MARS_LANTERN_SPEC.md`. Paste the **Master Prompt (§17)** into Antigravity. Where this file and the main spec disagree, **this file wins for the four upgraded areas**; the main spec wins everywhere else.

---

## 0. Honesty box: what is verified and what the agent must verify

| Item | Status |
|---|---|
| Your four feature descriptions (Martian Explorer, Terrain Intelligence, Multi-Mode Route Planning, Rover Intelligence) | Taken as the requirements. |
| Existing `src/` code (route planner panel, rover panel, A* worker, tests) | **Not visible to this document.** Agent must inspect it first (§1) and migrate, not rewrite. |
| Haversine radius 3,389.5 km | Matches main spec §4 (`MARS_RADIUS_KM`). Keep as the single constant. |
| PDS dataset id `MSL-M-ROVER-6-RDR-PLACES-V1.0` | Given by you. Agent must confirm the id, file names, column layout and units against the PDS Geosciences Node label (`.lbl`) before writing the parser (§9.2). |
| Perseverance traverse source | **Not confirmed here.** Candidates: NASA Mars 2020 location map data and PDS Geosciences Node Mars 2020 localization products. Agent must locate the real machine-readable file, record its URL and citation in `sources.json`, and fall back to a hand-digitised GeoJSON marked `coordConfidence: approx` only if no table exists. |
| Exact Trek / OpenPlanetary tile URLs | **Not hard-coded anywhere.** Read from `GetCapabilities` via the registry script (main spec §5.2). |
| Traversability thresholds, cost weights, speeds | **SIMULATED ASSUMPTIONS**, editable in `config/assumptions.ts`, shown in the UI. Not NASA requirements. |
| Milestone sol numbers and site facts in §10.4 | Seeds written from general mission knowledge, all marked `verify: true`. Agent must check each against NASA mission pages before release. |

**Global rules (unchanged):** every number carries a provenance badge `MEASURED · NASA-DERIVED · MODELED · SIMULATED · UNKNOWN`. Unknown terrain is never safe. A rover path is never presented as a human-safe path.

---

## 1. Phase 0 — Inspect before editing (agent must do this first)

1. List the existing files for: route planner panel, rover panel, pathfinding code/worker, terrain/slope code, rover data files, tests. Write `docs/UPGRADE_INVENTORY.md` with each file, what it does, and what will be kept, refactored, or replaced.
2. Run the existing tests and build. Paste real output into the inventory. Record the starting pass/fail state.
3. Identify the current slope formula, grid resolution, cost function, and where rover traverse data comes from (hand-typed array? file? fetch?).
4. Do **not** add a second map framework. Leaflet stays. (3D viewer exception: §6.)
5. Commit message convention: `P{n}: {what}`; commit after every phase.

---

## 2. Scope: four upgrades

| # | Upgrade | Deliverable |
|---|---|---|
| U1 | Martian Explorer | Layer registry (Trek WMTS + Viking + MOLA + OpenPlanetary basemap), bounded 2D map, optional 3D terrain/globe viewer (§4–§6) |
| U2 | Terrain Intelligence | DEM tiles → slope, aspect, roughness, data-gap mask → traversability raster (§7) |
| U3 | Multi-Mode Route Planning | Mode A Direct, Mode B Terrain-Aware A*, Mode C Historical Reference, comparison UI (§8–§9) |
| U4 | Historical Rover Intelligence & Rover Explorer | PDS-derived Curiosity track, Perseverance track, milestone browser, sol scrubber, proximity metrics (§10–§11) |

---

## 3. Shared architecture

```
src/core/                     # pure TS, no React, no DOM  (shared with MCP server)
  geo.ts                      # haversine, bearing, cross-track, destination point, lon conventions
  dem/
    demStore.ts               # tile loader + cache + bilinear sampler (injectable fetch)
    terrainAnalysis.ts        # Horn slope, aspect, roughness, gap mask
    traversability.ts         # thresholds → class raster + cost raster
  route/
    modeA.ts                  # direct great-circle
    modeB.ts                  # A* (runs in worker)
    modeC.ts                  # reference traverse + proximity metrics
    compare.ts                # side-by-side metrics for any set of routes
    types.ts                  # RouteResult, RouteRequest, flags
  rovers/
    parsePlaces.ts            # PDS PLACES table parser
    traverse.ts               # simplify, odometry, sol index, elevation along track
    milestones.ts             # milestone schema + loader
src/workers/routeWorker.ts    # Mode B only; message protocol in §9.5
src/components/
  RoutePlannerPanel/          # upgraded panel (§12)
  RoverExplorerPanel/         # upgraded panel (§13)
  map/MarsMap.tsx             # imperative Leaflet wrapper (main spec §3.2)
scripts/
  build-dem.py                # main spec §8.4, extended in §7.2
  build-traverses.ts          # PDS → GeoJSON + index (§10.2)
  build-layer-registry.ts      # main spec §5.2
public/data/
  dem/…  tracks/curiosity.geojson  tracks/perseverance.geojson  tracks/index.json
  milestones/curiosity.json  milestones/perseverance.json
  hazards.json  layers.json
```

**Boundary rule:** the UI calls `core` functions and renders results. The UI never computes slope, distance, or cost inline.

Single source of truth for coordinates: internal `lat` (planetocentric) and `lonE` (east-positive 0–360); convert to display longitude only at the Leaflet edge (`lon360ToDisplay`).

---

## 4. U1 — Martian Explorer (map and layers)

### 4.1 What it must provide
- Real NASA planetary cartography from **NASA Mars Trek WMTS** tiles: Viking color mosaic, MOLA shaded relief, MOLA color elevation, plus any HRSC / HiRISE / MOC mosaics that resolve in `GetCapabilities`.
- **OpenPlanetary Mars basemap** as an additional selectable base layer (see §4.3).
- Bounded, non-wrapping equirectangular view (`L.CRS.EPSG4326`, `noWrap: true`, `maxBounds`, `maxBoundsViscosity: 1`, `worldCopyJump: false`) — the infinite-loop fix from main spec §3. The calibration test (main spec §3.4) still blocks release.
- Overlays: rover traverses, planned routes (A/B/C), hazard polygons, slope/traversability raster, checkpoints, graticule, scale bar, cursor readout (lat, lon E, lon display, elevation, slope).

### 4.2 Layer registry additions
Extend the `layers.json` entry schema:

```jsonc
{
  "id": "mola-shaded-relief",
  "title": "MOLA Shaded Relief",
  "kind": "elevation",                 // satellite | elevation | slope | geology | polar | basemap
  "urlTemplate": "<from GetCapabilities ResourceURL>",
  "tileSize": 256, "minZoom": 0, "maxNativeZoom": 6,
  "bbox": [-180, -90, 180, 90],
  "projection": "equirectangular",
  "resolutionNote": "463 m/px native (MOLA)",
  "attribution": "NASA/JPL/USGS · Mars Trek",
  "provenance": "NASA-DERIVED",
  "role": "base",                      // base | overlay
  "critical": true,
  "verifiedOn": "YYYY-MM-DD"
}
```
- Layer switcher is a radio list for `role: base`, checkboxes for `role: overlay`.
- If a layer's `bbox` does not contain the current view centre, grey it out with "No coverage here". Missing tiles mean missing coverage, not an error.
- After 5 failed tile requests on a base layer, switch to the committed fallback global image (main spec §5.4) and show the banner.

### 4.3 OpenPlanetary basemap
- Treat it as **one more registry entry**, not a special case. The agent must find the current tile endpoint and licence from the OpenPlanetary project page/repo, confirm the projection (equirectangular vs web-mercator), and record both in `sources.json`.
- If it is not equirectangular, **do not** mix it into the same CRS. Either skip it, or show it only in the 3D/globe view as a texture. Record the decision in `docs/DATA_PROVENANCE.md`.
- If the endpoint cannot be verified at build time, omit the layer. Never guess a URL.

### 4.4 Acceptance for U1
- Pan to every edge: no repeating landmass, no marker duplication.
- Calibration markers (Olympus Mons summit, Jezero, Bradbury Landing) land within ~1°.
- Layer switch does not move or re-centre the map.
- DevTools shows `moveend` events stay below 20/s during a hard pan (dev guard from main spec §3.2).

---

## 5. 3D map decision (read before building)

You asked for "3d map". Three options, in order of preference:

| Option | Effort | Offline | Notes |
|---|---|---|---|
| **A. NASA Eyes on the Solar System iframe** (`eyes.nasa.gov/apps/solar-system/#/mars?embed=true`, from your resource file) | Very low | No (needs fallback image) | Orbit context only. No terrain from your DEM. |
| **B. Terrain mesh viewer** from your own DEM regional windows, drape the selected base layer as texture | Medium | Yes (data is local) | Best for showing route over slope. Recommended. |
| **C. Full globe** with global texture | Medium | Yes | Nice for the Overview page, little route value. |

**Decision:** build A (cheap, already in main spec §11.3) **and** B. Skip C unless time remains.

### 5.1 Option B requirements
- Lazy-loaded route `#/terrain3d` and a "3D" tab inside the route panel. Not in the initial bundle.
- Library: `three` only (a rendering library, not a map framework; this is the one allowed addition). Use a `PlaneGeometry` displaced by DEM heights, vertical exaggeration slider (1×–5×, default 2×, label shown on screen).
- Window size: one regional DEM window (2°×2° at 128 px/deg = 256×256 samples) or a user-drawn window up to 5°×5° resampled to ≤ 512×512 vertices.
- Texture: the current 2D base layer tiles for that bbox, or a vertex-colour ramp of slope/traversability if tiles are unavailable.
- Overlays in 3D: route polyline (colour by segment flag), rover traverse polyline, start/end markers, hazard footprints.
- Controls: orbit, pan, zoom, reset; keyboard alternatives; reduced-motion disables auto-rotate.
- Fallback: if WebGL is unavailable, show a 2D elevation profile and the message "3D view needs WebGL".
- Honesty label on screen: "463 m global / regional DEM — not rover-scale."

---

## 6. (reserved)

---

## 7. U2 — Terrain Intelligence

### 7.1 Slope: formula and implementation
Gradient-based slope from a DEM grid with elevation `z` (metres):

```
θ = atan( sqrt( (∂z/∂x)² + (∂z/∂y)² ) )
```

Use **Horn's method** (3×3 window, weights 1-2-1) for the partial derivatives. For a cell with neighbours

```
a b c
d e f
g h i
```

```
∂z/∂x = ((c + 2f + i) − (a + 2d + g)) / (8·Δx)     // east − west
∂z/∂y = ((g + 2h + i) − (a + 2b + c)) / (8·Δy)     // south − north (state your sign convention once and test it)
```

**Cell size must be in metres and latitude-aware** (equirectangular grids shrink east-west with latitude):

```
Δy = MARS_RADIUS_M · Δφ_rad
Δx = MARS_RADIUS_M · cos(φ) · Δλ_rad
```

```ts
// src/core/dem/terrainAnalysis.ts
export interface Grid {
  data: Float32Array | Int16Array;  // row-major, north→south
  width: number; height: number;
  lat0: number; lonE0: number;      // north-west corner (cell centre or corner: document which)
  dLatDeg: number; dLonDeg: number; // positive degrees per cell
  nodata: number;
}
export interface TerrainCell {
  slopeDeg: number | null;          // null when any of the 9 cells is nodata
  aspectDeg: number | null;
  roughnessM: number | null;
  hasData: boolean;
}
```
Rules:
- If any of the 3×3 cells is `nodata`, output `slopeDeg: null` and `hasData: false`. **Never interpolate across gaps silently.**
- Near the poles `cos φ → 0`; clamp `|φ| ≤ 89°` for Δx and flag cells beyond ±85° as `polarDistortion: true` (lower confidence).
- Roughness = standard deviation of elevation in a 5×5 window **after removing the local plane** (detrended) so a smooth ramp does not read as rough. Also store raw std-dev if you need compatibility with main spec §8.5, and document which one feeds the score.
- Aspect = `atan2(−∂z/∂x, ∂z/∂y)` converted to compass degrees. Used only for display and for the "uphill/downhill" arrow.

### 7.2 DEM data pipeline (extends main spec §8.4)
- Source: USGS Mars MGS MOLA DEM 463 m mosaic, resampled by `scripts/build-dem.py` into:
  - Global 8 ppd grid (long routes, overview).
  - Regional 128 ppd windows (2°×2°) for every checkpoint and rover traverse **plus a 1° buffer** around the Curiosity and Perseverance tracks.
- New in this release: `scripts/build-dem.py` also emits **derived rasters** per tile so the browser does not recompute slope for every route:
  - `slope_u8` (0–90°, 1 byte/cell, 255 = no data)
  - `rough_u8` (0–255 mapped to 0–510 m, 255 = no data)
  - `mask_u8` (bit 0 = valid, bit 1 = polar distortion, bit 2 = hazard polygon overlap)
- Keep the total DEM payload ≤ ~12 MB (main spec). Lazy-load tiles on demand.
- `demStore.getTile(id)` returns `{ grid, derived, resolution: 'global_8ppd' | 'regional_128ppd' }`. `sample(lat, lonE)` uses bilinear interpolation **only when all four corner cells are valid**.
- **Tests:** ramp of 20 m rise over 100 m horizontal must give 11.31° ±0.05°; flat plane gives 0°; a plane tilted east–west and one north–south each give the right aspect; a single nodata cell nullifies the 8 surrounding slope cells; Δx shrinks by `cos φ` at 60° (ratio 0.5).

### 7.3 Traversability thresholds (documented, configurable)
All values live in `config/assumptions.ts`, `source: 'SIMULATED ASSUMPTION'`, and are rendered in Settings with an "Edit" control and a "Reset to defaults" button.

| Vehicle | Slope limit (hard stop) | Caution band | Notes |
|---|---|---|---|
| `eva` (on foot) | 15° | 10–15° | Assumption; suit mobility and fall risk |
| `rover_unpressurised` | 20° | 12–20° | Assumption |
| `rover_pressurised` | 15° | 10–15° | Assumption; larger mass |

Classes (per cell, per vehicle):
```
UNKNOWN        no valid slope (data gap)        → impassable by default
NON_TRAVERSABLE slope ≥ limit, OR in hazard polygon, OR slope > 27° (RSL-class steep terrain)
HIGH_RISK      caution band top 1/3, OR roughness > 300 m
CAUTION        caution band
FAVOURABLE     below caution band and roughness ≤ 150 m
```
Roughness thresholds (150 / 300 m) are also assumptions at 463 m scale and carry the same label.

### 7.4 Strict data-gap penalties
- **Default policy: `UNKNOWN` is impassable.** The router treats it as a wall.
- **Risk-tolerant toggle** (off by default) lets Mode B cross `UNKNOWN` cells at cost `wu · GAP_COST` (default `GAP_COST = 8 ×` the cost of a favourable cell) and stamps every such segment `flag: 'NO_DATA'`; the whole route becomes `confidence: 'LOW'`.
- Coarse-only coverage (global 8 ppd, no regional tile) adds a flat `uncertainty` term (main spec §8.5: 0.15 coarse, 0.05 regional) and the UI repeats: "Coarse global data (~7 km/px). Slope is not rover-scale."
- A route's data-coverage metric = fraction of path length on cells with `resolution === 'regional_128ppd'` and `hasData`. Shown as a bar in the panel and fed to the mission evaluator's "Data coverage" verdict.

### 7.5 Cost raster (precomputed per vehicle)
For each cell, per vehicle, store a Float32 `baseCost` in the worker's memory (not shipped to the browser as data):

```
baseCost = wd·1 + ws·slopePenalty(slope) + wr·roughPenalty(rough) + wh·hazardPenalty + wu·uncertainty
slopePenalty(s) = (s / limit)^2            // quadratic: gentle ramps are cheap, near-limit is expensive
roughPenalty(r) = clamp(r / 500, 0, 1)
hazardPenalty   = severity (0–1) of the worst hazard polygon overlapping the cell
uncertainty     = 0.05 regional / 0.15 coarse
```
Default weights (assumptions): `wd = 1.0, ws = 4.0, wr = 1.5, wh = 6.0, wu = 2.0`. Edge cost = mean of the two cell costs × edge length (km), with the diagonal length computed on the sphere, not as `√2`.

---

## 8. U3 — Multi-Mode Route Planning: model

### 8.1 Common types
```ts
export type RouteMode = 'A_DIRECT' | 'B_TERRAIN_ASTAR' | 'C_ROVER_REFERENCE';
export type SegmentFlag = 'OK' | 'CAUTION' | 'STEEP' | 'NO_DATA' | 'HAZARD' | 'UNVERIFIED';
export type Vehicle = 'eva' | 'rover_unpressurised' | 'rover_pressurised';

export interface LatLonE { lat: number; lonE: number }

export interface RouteRequest {
  mode: RouteMode;
  from: LatLonE; to: LatLonE;
  vehicle: Vehicle;
  riskTolerant?: boolean;                // Mode B only
  referenceRover?: 'Curiosity' | 'Perseverance';  // Mode C only
  assumptions: Record<string, number>;   // snapshot of weights/limits used (reproducibility)
}

export interface RouteSegment {
  a: LatLonE; b: LatLonE;
  lengthKm: number; slopeDeg: number | null;
  flag: SegmentFlag;
}

export interface RouteResult {
  mode: RouteMode;
  ok: true;
  geometry: LatLonE[];
  segments: RouteSegment[];
  distanceKm: number;
  straightLineKm: number;
  detourRatio: number;                   // distanceKm / straightLineKm
  climbM: number; descentM: number;
  maxSlopeDeg: number | null;
  meanSlopeDeg: number | null;
  dataCoveragePct: number;               // % length on valid regional data
  noDataPct: number;
  passesSlopeLimit: boolean | 'UNKNOWN';
  timeHours: number | null;              // from vehicle speed assumption; null for Mode A
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED';
  warnings: string[];                    // always includes the mode's mandatory warning (§8.2–8.4)
  provenance: Provenance;                // A: MODELED, B: MODELED, C: NASA-DERIVED + MODELED metrics
  assumptionsUsed: Record<string, number | string>;
  computedAt: string;
}
export interface RouteError { mode: RouteMode; ok: false; error: 'NO_ROUTE' | 'OUT_OF_BOUNDS' | 'NO_DATA' | 'NO_REFERENCE_TRAVERSE'; reason: string }
```

### 8.2 Mode A — Direct Distance
- Great-circle path using the haversine formula with `R = 3389.5 km` (the single `MARS_RADIUS_KM` constant).
- Geometry: sample the great circle every 1 km (or 100 points, whichever is fewer) using spherical interpolation, so the line is correct on the equirectangular map. **Draw it as an arc, not a straight Leaflet line.** If it crosses the antimeridian (display lon ±180), split into two polylines.
- Also report: initial bearing, final bearing, and (if DEM available) an **elevation profile along the arc** and the **maximum slope sampled along it**, but only as information.
- **Mandatory warnings (always shown, cannot be hidden):**
  - "Direct path. Not checked for terrain safety."
  - If any sampled slope ≥ vehicle limit: "This line crosses terrain steeper than the limit for {vehicle}."
  - If any sample is `UNKNOWN`: "This line crosses areas with no terrain data."
- Result `confidence: 'UNVERIFIED'`, `segments[].flag = 'UNVERIFIED'` (or `STEEP` / `NO_DATA` when sampling detects it). `timeHours` is `null`.
- Haversine distance is the **lower bound** for every other mode. Test: `distanceKm(B) ≥ distanceKm(A) − ε`.

```ts
// src/core/geo.ts additions
export function greatCircleArc(a: LatLonE, b: LatLonE, stepKm = 1, maxPoints = 400): LatLonE[] { /* slerp */ }
export function initialBearingDeg(a: LatLonE, b: LatLonE): number { /* … */ }
export function destinationPoint(a: LatLonE, bearingDeg: number, distKm: number): LatLonE { /* … */ }
export function crossTrackKm(p: LatLonE, a: LatLonE, b: LatLonE): number { /* … */ }
```

### 8.3 Mode B — Terrain-Aware A*
- **Graph:** 8-connected grid over the DEM-derived cost raster. Resolution policy: ~0.25° grid for long routes (global tile); switch to regional 128 ppd tiles when both endpoints lie inside one regional window; for routes that span a regional tile and global data, run on the coarse grid and refine inside the tile (two-stage: coarse A*, then fine A* within a corridor of ±0.5° around the coarse path). Keep it simple: **if refinement is not finished, ship coarse-only and mark `confidence: 'LOW'`.**
- **Edge cost:** per §7.5. Non-traversable edges are omitted:
  - slope ≥ vehicle limit,
  - inside a hazard polygon,
  - `UNKNOWN` cell (unless `riskTolerant`, then high cost + `NO_DATA` flag),
  - cell slope > 27° regardless of vehicle.
- **Heuristic:** haversine distance to the goal × the minimum possible per-km cost (`wd`). This is admissible because every real edge costs ≥ `wd · length`. Test admissibility on synthetic grids.
- **Tie-breaking:** prefer lower slope on equal cost (add `1e-6 · slope`), to make results deterministic.
- **Snap start/end:** if an endpoint is on a non-traversable or unknown cell, search the nearest valid cell within 25 km; show "Start moved 3.2 km to nearest traversable cell" with the exact offset. If none, return `NO_ROUTE` with the reason.
- **Output flags per segment:** `OK` (favourable), `CAUTION`, `STEEP` (caution band top third), `NO_DATA`, `HAZARD` (only possible in risk-tolerant mode near polygons; default never). Smooth the path with a line-of-sight simplification **that re-checks each shortcut against the cost raster** (a shortcut must not cross a blocked or higher-cost cell). Never simplify across a flagged segment.
- **Alternatives:** compute **Shortest** (`ws = wr = wh = 0.5`) and **Safest** (default weights, `ws ×2`) and return both so the UI can compare. Run them in the same worker call.
- **Mandatory warnings:**
  - "Computed from 463 m MOLA data. Rocks, small scarps and dunes are not resolved."
  - "Model estimate under stated assumptions. Not a validated EVA route."
  - If coarse: "Coarse global data (~7 km/px)."
  - If `NO_DATA` segments: "N km of this route crosses areas with no terrain data."
- **Time estimate:** `timeHours = Σ(length / speed(slope))` using an assumption table (flat speed per vehicle, linear derating to 0 at the slope limit). Label `SIMULATED`.
- **Performance budget:** ≤ 2 s for 500 km on the 0.25° grid; ≤ 1 s inside one regional tile; the worker reports progress every 100 ms and supports `cancel`.

### 8.4 Mode C — Historical Rover Reference
Purpose: compare the user's planned route against a **validated robotic traverse**, not to generate a safe route.
- Reference = a Curiosity or Perseverance traverse (§10). The user chooses the rover or the planner suggests the one whose traverse lies closest to both endpoints.
- Mode C produces **two outputs**:
  1. **Reference path extract:** the portion of the rover traverse between the points nearest to `from` and `to` (by along-track position), with its own distance, climb, max slope (from the DEM), sols spent, and the sol range. If the rover never came within a **snap radius** (default 5 km) of an endpoint, return `NO_REFERENCE_TRAVERSE` with the nearest approach distance.
  2. **Proximity metrics** between the user's planned route (Mode A or B result) and the reference (see §8.5).
- **Mandatory warnings (cannot be hidden):**
  - "Robotic traverse (Curiosity/Perseverance). A rover drove here; this does **not** mean a human on foot or in a suit can walk it."
  - "Rover tracks reflect the science plan, not the safest or shortest path."
- Provenance: the reference geometry is `NASA-DERIVED` (PDS); every metric computed from it is `MODELED`. Display both badges.
- The reference path is **never** auto-converted into an EVA/rover route. The panel offers "Use as waypoints for Mode B" (user action) which feeds waypoints to A*, and Mode B still applies its own slope limits.

### 8.5 Route-to-traverse proximity metrics (`compare.ts`, pure functions)
For a planned route `P` and a reference traverse `T` (both polylines on the sphere). Resample both at 100 m (or 1 km for routes > 300 km) before computing:

| Metric | Definition |
|---|---|
| `meanOffsetKm` | mean of the shortest distance from each sample of `P` to `T` (cross-track to the nearest `T` segment) |
| `maxOffsetKm` | maximum of those distances (one-sided Hausdorff, P → T) |
| `hausdorffKm` | `max(P→T, T→P)` (symmetric) |
| `pctWithin(r)` | % of `P` length whose offset to `T` ≤ r, for r = 0.5, 2, 5 km |
| `coverageOfReferencePct` | % of `T` length whose offset to `P` ≤ 2 km (does the plan follow the traverse?) |
| `frechetKm` (optional) | discrete Fréchet distance; skip if > 2000 samples |
| `alongTrackAgreementPct` | % of `P` where moving direction is within 45° of `T`'s local direction |

Rules: when the nearest-segment search runs, use a simple grid index or a bounding-box prefilter (traverses can have 10⁴–10⁵ points; naive O(N·M) must be avoided). Tests: identical polylines → all offsets 0 and 100 %; a 1 km parallel offset → `meanOffsetKm ≈ 1`; disjoint routes → `pctWithin ≈ 0`.

### 8.6 Route comparison (`compare.ts`)
Given any 2–4 `RouteResult`s, output a table: distance, detour ratio, time, max slope, mean slope, climb, data coverage, NO_DATA %, confidence, warnings count. Highlight best per row **only for comparable rows** (do not highlight "time" for Mode A, which has none). Show the **verdict** per route against the selected vehicle: `PASSES SLOPE LIMIT` / `FAILS` / `UNKNOWN`.

---

## 9. U3 — Implementation notes

### 9.1 A* skeleton (worker)
```ts
// src/core/route/modeB.ts  (pure; worker just wraps it)
export function aStar(grid: CostGrid, start: Cell, goal: Cell, opts: { riskTolerant: boolean; onProgress?: (p: number) => void; shouldCancel?: () => boolean }): PathResult {
  // open set: binary heap keyed by f = g + h
  // neighbours: 8-connected; skip impassable (cost = Infinity)
  // edge length: haversine between cell centres (not grid units)
  // h(n) = haversineKm(n, goal) * W_D
}
```
- Use a binary heap (write one; ~40 lines) or a small dependency; no O(n) scans of the open set.
- `visited` as a typed array, not `Map`, for the 0.25° global grid (1440 × 720).

### 9.2 Mode C data readiness
Mode C depends on §10; build it after the traverse ETL passes validation. Until then, the Mode C button shows "Rover reference data not loaded" instead of failing.

### 9.3 Anti-loop rules for the route UI (main spec §3.2 applies)
- Routing runs **only on an explicit "Calculate" click**. No effects that recompute on slider/state changes.
- Changing vehicle/weights marks results **stale** ("Inputs changed — recalculate") instead of recomputing.
- Map receives routes via `map.setRoute(id, geometry, style)`; the panel never reads the viewport back.

### 9.4 Reproducibility
Every `RouteResult` stores `assumptionsUsed` (limits, weights, speeds, grid resolution, DEM tile ids, app version). "Copy as JSON" button exports it; the same JSON re-run must produce the same path (determinism test).

### 9.5 Worker message protocol
```ts
type WorkerIn  = { type: 'compute'; id: string; req: RouteRequest }
               | { type: 'cancel'; id: string };
type WorkerOut = { type: 'progress'; id: string; pct: number; phase: 'loading-dem' | 'building-costs' | 'search' | 'smoothing' }
               | { type: 'result'; id: string; results: (RouteResult | RouteError)[] }   // e.g. [shortest, safest]
               | { type: 'error'; id: string; message: string };
```
Worker loads DEM tiles itself (injectable fetch), so the main thread stays responsive. A second compute request cancels the first.

---

## 10. U4 — Historical Rover Intelligence: data

### 10.1 Sources (record in `sources.json`, `critical: true` for the first two)
| Rover | Data | Source | Status |
|---|---|---|---|
| Curiosity (MSL) | Localization / traverse table | **PDS PLACES** `MSL-M-ROVER-6-RDR-PLACES-V1.0` (PDS Geosciences Node) | Id from your README; verify files & columns |
| Perseverance (Mars 2020) | Traverse / waypoints | NASA Mars 2020 location-map data and/or PDS Geosciences Node Mars 2020 localization products | **Agent must locate real file**; see §0 |
| Both | Mission pages for milestones | NASA mission pages (Curiosity, Perseverance) | Used for milestone facts |
| Spirit / Opportunity (optional) | Traverse maps | NASA Photojournal traverse maps (your links) | Hand-digitised GeoJSON, `approx`, cite PIA id |

Strip `?utm_source=chatgpt.com` from every URL.

### 10.2 ETL — `scripts/build-traverses.ts`
Because the browser must not parse raw PDS tables:
1. Download the PDS table(s) and their `.lbl` label at build time (network allowed in CI/dev; not in the browser).
2. Parse using the label's column definitions (name, start byte, bytes, data type, units). **Do not hard-code column positions without reading the label.** Write the discovered column map into `docs/DATA_PROVENANCE.md`.
3. Extract per record: `sol`, `site`/`drive` index (if present), `lat`, `lon`, `elevation` (if present), `frame/units`. Convert lon to `lonE` 0–360 and lat to planetocentric if the product states planetographic (**read the label; do not assume**; if a conversion is needed, document the formula used).
4. Validate: drop records with null/sentinel coordinates; sort by sol then drive; reject jumps > a threshold (default 5 km between consecutive records) and **list them in `docs/TRAVERSE_QC.md`** instead of silently deleting.
5. Compute **odometry** (cumulative haversine along-track km) per record. Cross-check against any odometry value in the source; log the difference.
6. Emit:
   - `tracks/curiosity.geojson` — a `LineString` for the whole traverse (simplified with Douglas–Peucker at 20 m tolerance) **plus** `tracks/curiosity.points.json` (full-resolution sol index, `[sol, lat, lonE, elevM|null, odomKm]`, columnar arrays for size).
   - `tracks/index.json` — per rover: bbox, record count, sol range, total odometry, source citation, retrieved date, ETL version.
7. `elevation along track`: if the PDS table has elevation, store it as `NASA-DERIVED`. Independently sample the MOLA DEM and store as `DEM`; the UI shows both and the difference (they differ by design: rover-localized vs 463 m DEM).
8. Perseverance: same output shape. If only waypoint/milestone data exists (no dense table), emit a coarser track and set `track.density: 'sparse'`; the UI labels it "Waypoints only — path between points is straight-line interpolation".

**Size budget:** Curiosity points file ≤ 2 MB gz; Perseverance ≤ 1 MB gz. Lazy-load on first use of the Rover Explorer or Mode C.

### 10.3 Schemas
```ts
export interface TraverseIndexEntry {
  rover: 'Curiosity' | 'Perseverance';
  density: 'dense' | 'sparse';
  solMin: number; solMax: number;
  odometryKm: number; records: number;
  bbox: [number, number, number, number];     // [west, south, east, north] display lon
  source: { title: string; url: string; datasetId?: string; retrieved: string };
  provenance: 'NASA-DERIVED';
  etlVersion: string;
}
export interface TrackPoints {                 // columnar for size
  sol: number[]; lat: number[]; lonE: number[];
  elevM: (number | null)[]; odomKm: number[];
}
export interface Milestone {
  id: string; rover: 'Curiosity' | 'Perseverance';
  sol: number; earthDate?: string;
  name: string;                                // e.g. 'Yellowknife Bay'
  category: 'landing' | 'science_site' | 'sample' | 'drive_record' | 'hazard' | 'instrument' | 'other';
  lat: number | null; lonE: number | null;     // null if only region-level
  coordSource: 'pds-track' | 'nasa-page' | 'memory-verify';
  elevationM: number | null; elevationSource?: 'pds' | 'mola' | 'nasa-page';
  geology: string;                             // plain language, ≤ 280 chars
  whyItMatters: string;                        // survival/ISRU link where relevant (water, minerals, hazards)
  sources: { title: string; url: string }[];
  verify?: boolean;
}
```

### 10.4 Milestone seeds (`public/data/milestones/*.json`)
Agent writes the full list from NASA mission pages. These are **seeds with `verify: true`**; fill sol numbers and coordinates from the PDS track and NASA pages, not from memory.

**Curiosity (Gale Crater):** Bradbury Landing (landing; sol 0) · Glenelg / Yellowknife Bay (first drilled sample region; ancient habitable lake environment) · Rocknest (sand shadow soil analysis; links to `gale-rocknest` checkpoint) · Pahrump Hills · Bagnold Dunes (active dune field; hazard & science) · Vera Rubin Ridge · Clay-bearing unit / Glen Torridon · Sulfate-bearing unit / Mount Sharp ascent · Egg Rock (iron-nickel meteorite; in your links) · Finger-like cemented rocks (in your links) · "first 14 sampling sites" (in your links) · Drive-distance records (as stated by NASA).

**Perseverance (Jezero):** Octavia E. Butler Landing (landing) · Séítah / Crater Floor campaign · Delta front / Western Fan Delta (Kodiak, Hawksbill Gap) · Neretva Vallis (ancient river inlet) · Sample-caching sites (use NASA's sample list) · Ingenuity flight-field references (flag as helicopter; not a rover traverse) · Margin unit / crater rim campaigns.

**Each milestone must connect to survival value** in `whyItMatters` (e.g. "clay-bearing rock → hydrated minerals"; "dune field → mobility hazard for EVA"; "delta → possible ice or hydrated mineral resource, not confirmed"). Do not claim water presence without a source; use `UNKNOWN` or `NASA-DERIVED` correctly.

### 10.5 Calibration tests for rover data
- First Curiosity record is within 5 km of Bradbury Landing (4.59°S, 137.44°E, from main spec; `memory-verify` until checked).
- First Perseverance record is within 5 km of Jezero landing (18.44°N, 77.45°E; `memory-verify`).
- Odometry is monotonic non-decreasing; sol is non-decreasing.
- Curiosity total odometry within 1 % of the figure NASA states on its mission page on the verification date (agent records the figure and URL).
- Every milestone with coordinates lies within the traverse bbox ±5 km (or is flagged `region`).

---

## 11. U4 — Rover analytics

Pure functions in `src/core/rovers/traverse.ts`:

| Function | Returns |
|---|---|
| `positionAtSol(track, sol)` | interpolated `LatLonE` and elevation; clamps outside the sol range with a flag |
| `segmentBetweenSols(track, s1, s2)` | sub-track + distance, climb, max slope (DEM-based), mean daily drive |
| `drivesPerSol(track)` | array for charting; `sol` gaps explained as "no drive" |
| `slopeAlongTrack(track, dem)` | slope samples along the traverse (**NASA-DERIVED location, MODELED slope**) |
| `stats(track)` | total odometry, sols, max/mean sol-drive, max elevation, min elevation, elevation gain |
| `nearestApproach(track, point)` | min distance, sol at that point, along-track km |
| `slopeEnvelope(track, dem)` | percentile table (50/90/99/max) of DEM slope the rover traversed |

**"What a rover proves" panel:** the slope envelope shows the steepest 463 m-scale slope a rover traversed. Show with this fixed caption: *"Robotic vehicles have driven up to this slope at this data resolution. This does not set a human safety limit."* Never feed this number into the EVA limit automatically.

---

## 12. UI — upgraded Route Planner Panel

### 12.1 Layout (desktop: right drawer; mobile: bottom sheet)
```
┌─ ROUTE PLANNER ────────────────────────────────────┐
│ From [search/pick on map/checkpoint ▾]  ⇄  To [..] │
│ Vehicle  (•) EVA  ( ) Rover  ( ) Pressurised       │
│ Mode     [A Direct] [B Terrain A*] [C Rover Ref.]  │
│ ▸ Advanced: risk-tolerant ☐  weights…  grid…       │
│                         [ Calculate ]  [ Clear ]   │
├─ RESULTS ──────────────────────────────────────────┤
│ Tabs:  A | B-Shortest | B-Safest | C   (only those │
│        computed)                                   │
│ ⚠ Mandatory warning banners for the selected mode  │
│ Distance · Detour ratio · Time (SIMULATED) · Climb │
│ Max/mean slope · Pass/Fail vs limit                │
│ Data coverage bar · No-data % · Confidence badge   │
│ Elevation + slope profile (Recharts)  ● hover → map│
│ Segment table (flag chips; click → zoom to segment)│
├─ COMPARE ──────────────────────────────────────────┤
│ Table of computed routes; proximity metrics for C  │
├─ ACTIONS ──────────────────────────────────────────┤
│ Add to mission · Copy JSON · Export GPX/GeoJSON ·  │
│ Share link · Show in 3D                            │
└────────────────────────────────────────────────────┘
```

### 12.2 Behaviour rules
- Mode selector explains each mode in one line with an "i" tooltip (what it does, what it does **not** guarantee).
- Picking points: click-to-pick on map (cursor changes, `Esc` cancels), search box, or checkpoint list. Endpoints are draggable; dragging marks results stale.
- Progress bar and **Cancel** while Mode B runs. Errors (`NO_ROUTE`, `NO_DATA`, `OUT_OF_BOUNDS`) show a plain-language reason and a suggestion ("Try risk-tolerant mode", "Move the start away from the escarpment", "Choose Mode A for an unverified direct line").
- Status never colour-only: each flag has an icon + text (✓ OK, ! Caution, ▲ Steep, ? No data, ✕ Hazard).
- Colour/style of route lines on the map: A = dashed, B = solid, C reference = dotted; colour + dash pattern both carry meaning.
- Keyboard accessible, touch targets ≥ 44 px, no horizontal overflow at 360 px, `prefers-reduced-motion` honoured.
- State is serialisable to the URL hash (`#/map?from=…&to=…&mode=B&veh=eva`) for sharing. Results are recomputed on load only when the user presses Calculate (no surprise compute).

---

## 13. UI — upgraded Rover Explorer Panel

### 13.1 Layout
```
┌─ ROVER EXPLORER ───────────────────────────────────┐
│ Rover [Curiosity ▾ | Perseverance]   Source badge  │
│ Stats: sols · odometry km · elev range · density   │
├─ SOL SCRUBBER ─────────────────────────────────────┤
│ ◀ ▶ ⏯  [──────●─────────]  Sol 1234  (Earth date)  │
│ Map: rover marker + trail to current sol           │
├─ MILESTONES ───────────────────────────────────────┤
│ Filter chips: landing · science · sample · hazard… │
│ Search ▢   List/Timeline toggle                    │
│ Card: Sol · Name · Elevation (source badge) ·      │
│       Geology · Why it matters · Sources ·         │
│       [Fly to] [Show in satellite] [Use in route]  │
├─ ANALYTICS ────────────────────────────────────────┤
│ Elevation vs odometry · Drives per sol ·           │
│ Slope envelope (§11)                               │
└────────────────────────────────────────────────────┘
```

### 13.2 Behaviour
- Scrubber is the only driver of the "current sol"; map trail, stats and elevation chart read from it. Debounce at 100 ms. Play = advance N sols per second (default 10; respects reduced-motion by disabling autoplay).
- Milestone card **Fly to** uses the map's `flyTo` (or `setView` under reduced motion) and sets `source: 'ui'` to avoid the loop.
- **Use in route** sends the milestone as From/To into the Route Planner (user then presses Calculate).
- **Mode C link:** "Compare my route with this traverse" appears when a route exists and the track is loaded. It runs `compare.ts` and shows the metrics table; the mandatory Mode C warning appears directly above the metrics.
- Layers: toggle traverse line, milestone markers (clustered), current-sol marker, slope colouring of the trail (green→red by DEM slope, with the legend and an icon/legend text for colour-blind users).
- Honest labelling in the panel: "Track: NASA-DERIVED (PDS PLACES). Slope: MODELED from 463 m MOLA. Elevation: rover-localised vs DEM may differ."
- Empty/failure states: if a track fails to load via safe-fetch (`live → cache → fixture`), show the origin badge and a retry; the rest of the panel (milestones) still works.

---

## 14. Data-flow summary

```
PDS tables ──build-traverses.ts──► tracks/*.geojson + *.points.json ─┐
MOLA DEM ───build-dem.py─────────► dem/*.bin (+ slope/rough/mask) ──┼─► core (pure TS)
Trek GetCapabilities ─build-layer-registry.ts─► layers.json ────────┘      │
                                                                         workers/routeWorker
UI (Route Planner / Rover Explorer) ◄── results, badges, warnings ◄─────────┘
MCP server (mcp/server.ts) imports the same core → same numbers as the UI
```

---

## 15. MCP tool additions (extends main spec §14.2)
| Tool | Input | Returns |
|---|---|---|
| `plan_route` (upgraded) | `{ from, to, vehicle, mode: 'A'|'B'|'C', riskTolerant?, referenceRover? }` | `RouteResult` list or error, with warnings and assumptions |
| `compare_routes` | `{ routes: RouteResult[] }` | comparison table + proximity metrics |
| `get_rover_traverse` | `{ rover, solFrom?, solTo? }` | summary stats + simplified GeoJSON |
| `get_rover_milestones` | `{ rover, category?, solFrom?, solTo? }` | milestone list with provenance |
| `get_terrain_at` | `{ lat, lonE }` | elevation, slope, aspect, roughness, class per vehicle, resolution flag |

Every response includes `provenance`, `assumptionsUsed`, `warnings`. The MCP server must **repeat the mandatory mode warnings**, so an agent cannot present a Mode A or C route as safe.

---

## 16. Testing and acceptance

### 16.1 Unit tests (Vitest, run in CI)
- **geo:** haversine (known distance, e.g. 1° on the equator = `2π·3389.5/360` ≈ 59.17 km); 0/360 wrap; antimeridian arc split; bearing; cross-track on a known right angle; poles.
- **terrain:** Horn slope on ramp (11.31°), flat (0°), tilted planes (aspect), nodata nullification, latitude scaling of Δx, roughness detrending (smooth ramp → ~0).
- **traversability:** boundary cases at exactly the limit (≥ limit is non-traversable), `UNKNOWN` impassable default, RSL-class > 27° always blocked.
- **Mode A:** distance equals haversine, arc crosses the antimeridian correctly, warnings always present, `confidence = UNVERIFIED`.
- **Mode B:** open field (path ≈ straight, detour ratio ≈ 1.0), ramp corridor (path takes the gentle corridor, not the cliff), blocked corridor → `NO_ROUTE`, unknown cell avoided by default and crossed (flagged `NO_DATA`, `LOW`) when risk-tolerant, admissible heuristic, determinism (same input → same path), cancel works, start snapped with the reported offset.
- **Mode C:** identical route vs reference → all-zero offsets; parallel 1 km offset; no reference near endpoints → `NO_REFERENCE_TRAVERSE`; mandatory warning present.
- **Rovers:** column parser against a committed small fixture of a real PDS label + table excerpt; odometry monotonic; sol interpolation; calibration tests (§10.5).
- **Schema:** Zod round-trip for `RouteRequest`, `RouteResult`, `Milestone`, `TraverseIndexEntry`.

### 16.2 Integration / manual
- Pick two points on the Curiosity traverse → Mode A, B, C all produce results → compare table renders → export JSON → reload from the URL hash.
- Scrub the rover to sol 0 and the last sol; the marker is at the landing site and at the final position respectively.
- Pan to every map edge: no loop. Hard-pan CPU stays idle after release.
- Offline (`?offline=1`): panel opens with fixtures; origin badges show `FIXTURE`.
- Mobile 360 px, keyboard-only run, reduced motion.

### 16.3 Release gate
`npm test` green; `npm run build` green; Pages URL works in a private window; no console errors; `docs/LINK_AUDIT.md` shows critical sources OK; `docs/TRAVERSE_QC.md` committed; every number on screen has a provenance badge; mandatory warnings visible for every route mode.

---

## 17. Master Prompt for Antigravity (paste this)

```
PROJECT: MARS LANTERN — upgrade Route Planner, Rover Explorer, Terrain Intelligence, Martian Explorer.
Read MARS_LANTERN_SPEC.md and MARS_LANTERN_ROUTING_ROVER_SPEC.md fully, then the repo, before editing.
Work in the EXISTING repo (React 18, TypeScript strict, Vite, Tailwind, Leaflet, Recharts).
Do not add a second map framework. `three` is allowed only for the lazy-loaded 3D terrain viewer.

ORDER OF WORK (commit after each phase; run tests/build between phases):
R0  Inspect repo → docs/UPGRADE_INVENTORY.md with real test/build output (spec §1). Report before changing.
R1  core/geo additions: great-circle arc, bearings, destinationPoint, crossTrack + tests (§8.2, §8.5).
R2  DEM: demStore, Horn slope/aspect/detrended roughness, nodata masks, derived rasters in build-dem.py + tests (§7).
R3  Traversability classes, vehicle limits, data-gap policy, config/assumptions.ts + Settings display (§7.3–7.5).
R4  Mode A (direct, mandatory warnings) + route result types + Zod schemas (§8.1–8.2).
R5  Mode B A* in a worker: cost raster, snapping, shortest+safest, progress/cancel, determinism + tests (§8.3, §9).
R6  Traverse ETL from PDS (read the .lbl; QC report; Curiosity first), then Perseverance source discovery (§10.1–10.2).
R7  Rover analytics + Mode C + proximity metrics + comparison + tests (§8.4–8.6, §11).
R8  UI: upgraded Route Planner panel (§12), URL-hash state, anti-loop rules (§9.3).
R9  UI: upgraded Rover Explorer panel: scrubber, milestones, analytics, links to routes (§13). Milestones filled from NASA pages with verify flags resolved.
R10 Martian Explorer layer registry: Trek GetCapabilities, OpenPlanetary decision, fallback basemap; calibration markers (§4).
R11 3D terrain viewer (lazy-loaded, Option B) + Eyes iframe fallback (§5).
R12 MCP tool additions (§15), link audit, accessibility/responsive/offline QA, final report (§16).

HARD RULES: never fabricate NASA data or coordinates; read PDS labels instead of assuming columns;
UNKNOWN terrain is never safe; rover tracks are never presented as human-safe routes; Mode A and Mode C
mandatory warnings can never be hidden; all thresholds/weights/speeds are labelled SIMULATED ASSUMPTION
and editable; every value gets a provenance badge; do not hard-code tile URLs; strip utm_ params;
update docs/AI_USE.md with every significant AI-generated change.

FINISH: summarise changes, list files, say which outputs are real (PDS/NASA-derived) vs modeled vs simulated,
paste real test/build output, and give the start command (npm run dev) and the Pages deployment steps.
```

---

## 18. Known limitations to state in the app
- MOLA 463 m terrain cannot resolve rocks, small scarps, dunes or rover-scale hazards; slope and roughness are regional indicators.
- Thresholds, weights and speeds are simulation assumptions, not NASA safety requirements.
- Mode A is an unverified geometric distance. Mode B is a model under stated assumptions. Mode C is historical robotic evidence, not human EVA validation.
- Rover traverses reflect science objectives; they are neither shortest nor safest paths.
- Rover-localised elevations and DEM elevations differ; both are shown, not merged.
- Perseverance traverse density depends on the source found at build time (dense vs waypoint-only).
- 3D view is a vertically exaggerated model of coarse data, for orientation only.

*End of upgrade specification.*
