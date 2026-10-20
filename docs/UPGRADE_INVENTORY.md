# MARS LANTERN — Upgrade Inventory (R0 Phase)
**Challenge:** NASA Space Apps 2026 — *Interplanetary Survival Guide: Martian Map*  
**Specification:** `MARS_LANTERN_ROUTING_ROVER_SPEC.md` §1 & `MARS_LANTERN_SPEC_v2.1_APP_ADDENDUM.md` §8  
**Updated:** 2026-10-20  

---

## 1. Baseline Test & Build Verification (Real Console Outputs)

### 1.1 Test Suite Output (`npm test`)
Executed on Node v24.19.0 / Vitest v2.1.9:
```
> mars-lantern@1.0.0 test
> vitest run

 RUN  v2.1.9 C:/Users/User/OneDrive/Documents/The martian map

 ✓ tests/mcpAndData.test.ts (5 tests) 19ms
 ✓ tests/geo.test.ts (13 tests) 8ms
 ✓ tests/calibration.test.ts (4 tests) 6ms
 ✓ tests/search.test.ts (6 tests) 7ms
 ✓ tests/sky.test.ts (7 tests) 7ms
 ✓ tests/safeFetch.test.ts (4 tests) 7ms
 ✓ tests/traversability.test.ts (8 tests) 8ms
 ✓ tests/terrainAnalysis.test.ts (8 tests) 8ms
 ✓ tests/modeB.test.ts (7 tests) 51ms
 ✓ tests/roverAnalyticsAndModeC.test.ts (12 tests) 55ms
 ✓ tests/mission.test.ts (5 tests) 15ms
 ✓ tests/routeCore.test.ts (4 tests) 17ms
 ✓ tests/terrainCost.test.ts (3 tests) 3ms
 ✓ tests/roverTraverse.test.ts (4 tests) 8ms
 ✓ tests/routeSearch.test.ts (4 tests) 8ms
 ✓ tests/distance.test.ts (6 tests) 5ms
 ✓ tests/types.test.ts (3 tests) 7ms
 ✓ tests/layerRegistry.test.ts (2 tests) 10ms
 ✓ tests/modeA.test.ts (6 tests) 29ms
 ✓ tests/report.test.ts (12 tests) 21ms
 ✓ tests/checkpoints.test.ts (5 tests) 32ms
 ✓ tests/roverTraverseEtl.test.ts (6 tests) 103ms

 Test Files  22 passed (22)
      Tests  134 passed (134)
   Start at  12:49:25
   Duration  20.40s
```
**Vitest Pass/Fail State:** 22 test files, 134 tests, 100% passing.

---

### 1.2 Production Build Output (`npm run build`)
Executed via `tsc && vite build`:
```
> mars-lantern@1.0.0 build
> tsc && vite build

src/core/route/compare.ts(10,28): error TS2305: Module '"./types"' has no exported member 'VehicleType'.
src/core/route/compare.ts(195,9): error TS2367: This comparison appears to be unintentional because the types 'RouteMode' and '"A"' have no overlap.
src/core/route/compare.ts(197,16): error TS2367: This comparison appears to be unintentional because the types '"B_TERRAIN_ASTAR" | "C_ROVER_REFERENCE"' and '"B"' have no overlap.
src/core/route/compare.ts(197,34): error TS2367: This comparison appears to be unintentional because the types '"B_TERRAIN_ASTAR" | "C_ROVER_REFERENCE"' and '"B_SHORTEST"' have no overlap.
src/core/route/compare.ts(197,61): error TS2367: This comparison appears to be unintentional because the types '"B_TERRAIN_ASTAR" | "C_ROVER_REFERENCE"' and '"B_SAFEST"' have no overlap.
src/core/route/compare.ts(201,16): error TS2367: This comparison appears to be unintentional because the types '"B_TERRAIN_ASTAR" | "C_ROVER_REFERENCE"' and '"C"' have no overlap.
src/core/route/compare.ts(272,31): error TS18047: 'r.maxSlopeDeg' is possibly 'null'.
src/core/route/compare.ts(278,31): error TS18047: 'r.meanSlopeDeg' is possibly 'null'.
src/core/route/modeC.ts(33,7): error TS2322: Type '"C"' is not assignable to type 'RouteMode'.
src/core/route/modeC.ts(42,7): error TS2322: Type '"C"' is not assignable to type 'RouteMode'.
src/core/route/modeC.ts(97,21): error TS2339: Property 'getElevationAt' does not exist on type 'DemStore'.
src/core/route/modeC.ts(98,21): error TS2339: Property 'getElevationAt' does not exist on type 'DemStore'.
src/core/route/modeC.ts(99,26): error TS2339: Property 'getTerrainAt' does not exist on type 'DemStore'.
src/core/route/modeC.ts(147,5): error TS2322: Type '"C"' is not assignable to type 'RouteMode'.
src/core/rovers/traverse.ts(338,32): error TS2339: Property 'getTerrainAt' does not exist on type 'DemStore'.
tests/roverAnalyticsAndModeC.test.ts(98,9): error TS2322: Type '"C"' is not assignable to type 'RouteMode'.
tests/roverAnalyticsAndModeC.test.ts(122,9): error TS2322: Type '"C"' is not assignable to type 'RouteMode'.
tests/roverAnalyticsAndModeC.test.ts(182,9): error TS2322: Type '"A"' is not assignable to type 'RouteMode'.
```
**Build Status:** Fails in strict `tsc` due to minor enum type mismatches in `compare.ts`, `modeC.ts`, and missing convenience methods on `DemStore` (`getElevationAt`, `getTerrainAt`). These will be cleanly addressed during R2, R4, R7.

---

## 2. Addendum §8 Page & Architecture Inspection

| Page / Component | Route | Current Data Source | Current Map Usage | Notes & Plan |
|---|---|---|---|---|
| `RoutePlannerPage` | `/planner/route` | `useRoutePlanner()` hook, `public/data/checkpoints.json` | Directly renders `<MarsMap>` | Upgrade in R8 with Mode A/B/C selectors, mandatory warnings, progress/cancel, URL-hash params, connect to `routeStore`. |
| `CompareRoutesPage` | `/planner/compare` | `useRoutePlanner()` hook (`primaryRoute`, `alternativeRoute`) | Directly renders `<MarsMap>` | Upgrade in R8 to read `results` from `src/state/routeStore.ts`, use `src/core/route/compare.ts`. |
| `RoverExplorerPage` | `/rovers` | Static `ALL_ROVER_TRAVERSES` in `src/data/roverTraverses.ts` | Directly renders `<MarsMap>` | Upgrade in R9 with Sol scrubber, PDS-derived tracks, NASA milestones, analytics, "Use in route". |
| `TerrainPage` | `/terrain` | `src/core/dem.ts`, `src/core/terrain.ts` | None (renders Recharts elevation profile) | Update in R2 to leverage Horn's method & detrended roughness from `src/core/dem/`. |
| `MapPage` | `/map` | `useMarsLayers()`, `useRoutePlanner()`, `data/checkpoints.json` | Directly renders `<MarsMap>` with overlays | Refactor in R10 to read-only route/rover rendering from `routeStore`; introduce `createMarsMap()` helper. |
| `HazardPage` | `/hazards` | `src/data/hazardsCatalog.ts`, `public/data/checkpoints.json` | Directly renders `<MarsMap>` | Clean Leaflet instance, preserve hazard polygon rendering. |
| `AppShell` | Layout root | Shell context, `data/checkpoints.json` | TopBar, SideRail, BottomTabs, CommandPalette | Add lightweight `<ErrorBoundary>` around `<Outlet />` (Addendum §5). |

### State Management Library
- Checked `package.json`: No Redux, no Zustand.
- Solution per Addendum §3: Implement `src/state/routeStore.ts` using React's native `useSyncExternalStore` (zero extra dependencies).

---

## 3. Analysis of Formulas, Grids & Data Sources

1. **Slope Formula:**
   - Current legacy: Simple 4-neighbor finite difference in `src/core/dem.ts`.
   - Upgraded core: **Horn's method** ($3 \times 3$ window, $1-2-1$ weights) in `src/core/dem/terrainAnalysis.ts`:
     $$\frac{\partial z}{\partial x} = \frac{(c + 2f + i) - (a + 2d + g)}{8 \Delta x},\quad \frac{\partial z}{\partial y} = \frac{(g + 2h + i) - (a + 2b + c)}{8 \Delta y}$$
     $$\Delta y = R_{\text{Mars}} \cdot \Delta\phi_{\text{rad}},\quad \Delta x = R_{\text{Mars}} \cdot \cos(\phi) \cdot \Delta\lambda_{\text{rad}}$$
     Strict `nodata` propagation (any nodata in $3 \times 3 \rightarrow \text{null}$).

2. **Grid Resolution:**
   - Global grid: $8\text{ ppd}$ ($\approx 7.4\text{ km/cell}$).
   - Regional tiles: $128\text{ ppd}$ ($\approx 463\text{ m/cell}$).
   - Derived rasters: `slope_u8`, `rough_u8`, `mask_u8`.

3. **Traversability & Cost Raster:**
   - Vehicle limits: EVA $15^\circ$, unpressurised $20^\circ$, pressurised $15^\circ$.
   - Caution bands: $10\text{--}15^\circ$, $12\text{--}20^\circ$, $10\text{--}15^\circ$.
   - Quadratic slope cost: $(s / \text{limit})^2$.
   - IMPASSABLE: slope $\ge$ limit, hazard polygon, slope $> 27^\circ$ (RSL-class), `UNKNOWN` unless risk-tolerant.

4. **Rover Data:**
   - Currently static 18 points.
   - Target: PDS PLACES dataset (`MSL-M-ROVER-6-RDR-PLACES-V1.0`) parsed by column definitions from `.lbl`, emitting `public/data/tracks/curiosity.geojson` + `curiosity.points.json` + `index.json`.

---

## 4. Map Framework Compliance
- Framework: strictly **Leaflet 1.9** + **React-Leaflet 4.2** with `L.CRS.EPSG4326` (equirectangular, bounded, no-wrap).
- 3D terrain viewer: will use lazy-loaded `three` only (Option B).
