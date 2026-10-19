# MARS LANTERN — Upgrade Inventory (R0 Phase)
**Challenge:** NASA Space Apps 2026 — *Interplanetary Survival Guide: Martian Map*  
**Specification:** `MARS_LANTERN_ROUTING_ROVER_SPEC.md` §1  
**Generated:** 2026-10-19  

---

## 1. Baseline Test & Build Verification

### 1.1 Test Suite Output (`npm test -- --run`)
Executed on Node v24.19.0 / Vitest v2.1.9:
```
> mars-lantern@1.0.0 test
> vitest run --run

 RUN  v2.1.9 C:/Users/User/OneDrive/Documents/The martian map

 ✓ tests/mcpAndData.test.ts (5 tests) 21ms
 ✓ tests/geo.test.ts (6 tests) 4ms
 ✓ tests/distance.test.ts (6 tests) 6ms
 ✓ tests/terrainCost.test.ts (3 tests) 5ms
 ✓ tests/calibration.test.ts (4 tests) 6ms
 ✓ tests/sky.test.ts (7 tests) 8ms
 ✓ tests/search.test.ts (6 tests) 8ms
 ✓ tests/roverTraverse.test.ts (4 tests) 9ms
 ✓ tests/safeFetch.test.ts (4 tests) 9ms
 ✓ tests/routeSearch.test.ts (4 tests) 10ms
 ✓ tests/routeCore.test.ts (4 tests) 21ms
 ✓ tests/mission.test.ts (5 tests) 13ms
 ✓ tests/types.test.ts (3 tests) 19ms
 ✓ tests/layerRegistry.test.ts (2 tests) 22ms
 ✓ tests/checkpoints.test.ts (5 tests) 40ms
 ✓ tests/report.test.ts (12 tests) 31ms

 Test Files  16 passed (16)
      Tests  80 passed (80)
   Start at  20:40:36
   Duration  29.48s (transform 2.15s, setup 0ms, collect 17.99s, tests 231ms, environment 12ms, prepare 20.68s)
```
**Baseline Pass/Fail State:** 16 test files, 80 tests, 100% passing.

---

### 1.2 Production Build Output (`npm run build`)
Executed via `tsc && vite build`:
```
> mars-lantern@1.0.0 build
> tsc && vite build

vite v5.4.21 building for production...
transforming...
✓ 2586 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                              1.38 kB │ gzip:   0.68 kB
dist/assets/index-QrqH7YIM.css              81.88 kB │ gzip:  18.06 kB
dist/assets/check-Ml46LPlM.js                0.29 kB │ gzip:   0.24 kB
dist/assets/chevron-left-CHhUqQDs.js         0.30 kB │ gzip:   0.25 kB
dist/assets/thermometer-C-EvDh76.js          0.33 kB │ gzip:   0.26 kB
dist/assets/rotate-ccw-BCgObhp3.js           0.37 kB │ gzip:   0.29 kB
dist/assets/sparkles-JBDlg6Fk.js             0.68 kB │ gzip:   0.40 kB
dist/assets/GlassPanel-BgsnnqZb.js           0.72 kB │ gzip:   0.40 kB
dist/assets/assumptions-yBjeKqfb.js          0.85 kB │ gzip:   0.28 kB
dist/assets/Chip-ciGmC-7x.js                 0.86 kB │ gzip:   0.53 kB
dist/assets/temperature-C_R4OLA6.js          0.92 kB │ gzip:   0.63 kB
dist/assets/Tabs-KdfBJteJ.js                 0.95 kB │ gzip:   0.58 kB
dist/assets/terrain-BDqsPxU4.js              1.22 kB │ gzip:   0.73 kB
dist/assets/flame-BY7XaqFx.js                1.38 kB │ gzip:   0.60 kB
dist/assets/Footer-Cd1cwJjA.js               1.72 kB │ gzip:   0.83 kB
dist/assets/StatCard-CkTDp4yY.js             2.05 kB │ gzip:   0.95 kB
dist/assets/SourceBadge-B2FCK0Sn.js          2.19 kB │ gzip:   1.06 kB
dist/assets/Button-8zBmb7gz.js               2.39 kB │ gzip:   1.07 kB
dist/assets/dem-BPy9Eqkd.js                  2.54 kB │ gzip:   1.20 kB
dist/assets/hazardsCatalog-BQCJmsoa.js       4.25 kB │ gzip:   1.85 kB
dist/assets/HazardPage-DD0G4I7P.js           5.14 kB │ gzip:   2.08 kB
dist/assets/SciencePage-DCeiRCbk.js          5.65 kB │ gzip:   2.10 kB
dist/assets/RoverExplorerPage-BsZuhqux.js    6.83 kB │ gzip:   2.36 kB
dist/assets/scienceCatalog-DKSqq-Gp.js       6.95 kB │ gzip:   3.11 kB
dist/assets/CompareRoutesPage-BFH2SaxT.js    7.03 kB │ gzip:   2.09 kB
dist/assets/AboutPage-CfI-sR_-.js            7.08 kB │ gzip:   2.45 kB
dist/assets/TerrainPage-KVwxYQe4.js          8.01 kB │ gzip:   2.55 kB
dist/assets/FieldManualPage-CvQDyUxZ.js      9.56 kB │ gzip:   3.58 kB
dist/assets/WeatherPage-BLhHuvyM.js         10.19 kB │ gzip:   3.56 kB
dist/assets/BriefingPage-DDFzj_XK.js        11.41 kB │ gzip:   3.60 kB
dist/assets/SatellitePage-3fScVetM.js       11.42 kB │ gzip:   4.29 kB
dist/assets/useRoutePlanner-9ZvTUCFn.js     12.05 kB │ gzip:   5.09 kB
dist/assets/RoutePlannerPage-D6ZbLO07.js    12.08 kB │ gzip:   4.16 kB
dist/assets/SurvivalPage-CbhBc2MB.js        13.01 kB │ gzip:   4.59 kB
dist/assets/LandingPage-BkyLbhML.js         13.03 kB │ gzip:   4.52 kB
dist/assets/SkyPage-BQYr-I7O.js             19.51 kB │ gzip:   5.73 kB
dist/assets/PlannerPage-DPgmDJUw.js         23.59 kB │ gzip:   7.81 kB
dist/assets/useMarsLayers-Dx7ArPL7.js       35.04 kB │ gzip:  10.97 kB
dist/assets/MapPage-DCv3NHHb.js            138.87 kB │ gzip:  39.62 kB
dist/assets/leaflet-src-ihbPbcbA.js        149.59 kB │ gzip:  43.36 kB
dist/assets/index-BXxPQ6ps.js              252.96 kB │ gzip:  79.87 kB
dist/assets/AreaChart-G6KYanIO.js          376.07 kB │ gzip: 104.09 kB
✓ built in 29.45s
```
**Baseline Build State:** Clean build, 0 errors.

---

## 2. Inventory of Existing Routing, Rover & Terrain Assets

| Category | File Path | Existing Functionality | Upgrade Action Plan |
|---|---|---|---|
| **Route Planner Panel** | `src/components/route/RoutePlanner.tsx` | UI input form for start/destination coordinates, vehicle speed/slope controls, route generation button, simple stats. | **Refactor:** Upgrade to §12 layout with Mode A / B / C selectors, mandatory warning banners, segment table with flags, comparison integration, URL-hash sync. |
| **Route Comparison** | `src/components/route/RouteComparison.tsx` | Side-by-side trade-off comparison between primary and alternative route. | **Refactor:** Extend with §8.6 route comparison matrix and §8.5 proximity metrics. |
| **Mission Summary** | `src/components/route/MissionSummary.tsx` | Mission briefing, consumable budget, print/export. | **Keep:** Integrate with upgraded multi-mode route results. |
| **Rover Panel** | `src/components/route/RoverExplorer.tsx` | Basic Curiosity/Perseverance switcher, landing site info, waypoints list. | **Refactor:** Upgrade to §13 layout with Sol scrubber, milestone timeline, elevation profile, and Mode C integration. |
| **Routing Hook** | `src/hooks/useRoutePlanner.ts` | State machine triggering web worker or direct calculation. | **Refactor:** Upgrade with cancellation, progress tracking, Mode A/B/C multi-result state, and URL hash serialization. |
| **Routing Engine** | `src/core/route.ts` | Spherical A* pathfinding using MOLA anchors + RBF model. | **Refactor & Split:** Modularize into `src/core/route/` (`modeA.ts`, `modeB.ts`, `modeC.ts`, `types.ts`, `compare.ts`) while preserving backwards compatibility. |
| **Legacy A* Search** | `src/algorithms/routeSearch.ts` | Legacy A* search on synthetic `TerrainGrid`. | **Keep:** Retain for algorithmic comparison and existing test suites. |
| **Background Worker** | `src/workers/routeWorker.ts` | Worker executing `planMarsRoute` for shortest and safest. | **Refactor:** Upgrade to §9.5 message protocol (`compute`, `cancel`, `progress`, `result`, `error`). |
| **Planetary Math** | `src/core/geo.ts` | Haversine distance, coordinate normalization (0–360°E), planetocentric conversions. | **Extend:** Add `greatCircleArc`, `initialBearingDeg`, `destinationPoint`, `crossTrackKm` (§8.2). |
| **DEM & Topography** | `src/core/dem.ts` | MOLA anchors RBF + harmonic elevation, simple 4-neighbor finite difference slope. | **Extend:** Complement with `demStore.ts` and `terrainAnalysis.ts` for Horn's method, aspect, detrended roughness, and nodata masking (§7.1). |
| **Terrain Quality** | `src/core/terrain.ts` | Deterministic terrain quality scoring (0–100) and traversability classification. | **Extend:** Align with strict traversability classes and data-gap policies (§7.3–§7.4). |
| **Terrain Cost Math** | `src/algorithms/terrainCost.ts` | `calculateEdgeCost` and `calculateSlopeDeg`. | **Keep:** Reference implementation and test support. |
| **Rover Data** | `src/data/roverTraverses.ts` | Hard-coded 18 waypoints each for Curiosity and Perseverance. | **Migrate & Replace:** Replace with real PDS-derived GeoJSON files (`tracks/curiosity.geojson`, `tracks/perseverance.geojson`) and point index generated via `scripts/build-traverses.ts`. |
| **DEM ETL Script** | `scripts/build-dem.py` | Python script generating global 8 ppd and regional 128 ppd DEM grids. | **Extend:** Add derived rasters (`slope_u8`, `rough_u8`, `mask_u8`) per tile (§7.2). |
| **Layer Registry** | `scripts/build-layer-registry.ts` | Script building `public/data/layers.json` from NASA Trek WMTS. | **Extend:** Add OpenPlanetary basemap evaluation, MOLA shaded relief, and offline fallback (§4). |

---

## 3. Analysis of Current Formulas & Data Sources

1. **Slope Formula:**
   - Currently in `src/core/dem.ts`:
     $$\text{grad}_y = \frac{e_{\text{north}} - e_{\text{south}}}{\Delta y},\quad \text{grad}_x = \frac{e_{\text{east}} - e_{\text{west}}}{\Delta x}$$
     $$\theta = \text{atan}(\sqrt{\text{grad}_x^2 + \text{grad}_y^2})$$
   - Requirement (§7.1): Implement **Horn's method** (3×3 weighted window: $1-2-1$) with latitude-aware $\Delta x = R \cos(\phi) \Delta\lambda_{\text{rad}}$ and $\Delta y = R \Delta\phi_{\text{rad}}$, with strict nodata propagation and roughness detrending.

2. **Grid Resolution:**
   - Global grid: 8 pixels per degree ($\approx 7.4\,\text{km/px}$ at equator).
   - Regional windows: 128 pixels per degree ($\approx 463\,\text{m/px}$).

3. **Cost Function:**
   - Currently: $C(e) = w_d D(e) + w_s S(e) + w_r R(e) + w_h H(e) + w_u U(e)$.
   - Requirement (§7.5): Precomputed Float32 cost raster in worker with quadratic slope penalty $(s / \text{limit})^2$, clamped roughness penalty $\text{clamp}(r / 500, 0, 1)$, hazard polygon overlaps, and default policy where `UNKNOWN` is impassable unless risk-tolerant mode is selected.

4. **Rover Traverse Data:**
   - Currently hand-typed arrays in `src/data/roverTraverses.ts` with 18 endpoints per rover.
   - Requirement (§10): Automated PDS ETL parsing `MSL-M-ROVER-6-RDR-PLACES-V1.0` labels, generating validated GeoJSON tracks, sol indices, and odometry cross-checks.

---

## 4. Map Framework Constraint Check
- Current map framework: **Leaflet 1.9** + **React-Leaflet 4.2** with `L.CRS.EPSG4326` (equirectangular).
- Framework addition rule: **Strictly preserved.** No second 2D map framework will be added.
- 3D terrain viewer: Will be lazy-loaded using `three` only (Option B).
