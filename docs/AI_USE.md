# MARS LANTERN — AI Use & Architecture Transparency Log

**Challenge:** NASA Space Apps Challenge 2026 — *Interplanetary Survival Guide: Martian Map*  
**Standard:** Continuous transparency and disclosure of AI-assisted engineering (Spec §16, §17).

---

## Phases Executed & Architecture History

### Phase P0: Map Loop Root Cause Analysis
- **Diagnosis Documented:** `docs/MAP_LOOP_ROOT_CAUSE.md`
- **Cause Identified:** Dual root causes:
  1. Leaflet default World-Mercator infinite visual wrapping (`worldCopyJump`, unbound longitude).
  2. React-Leaflet unthrottled cursor telemetry updating root state on every mouse movement, triggering cascading re-renders.

### Phase P1: Branding, Offline Manifest & GitHub Actions Deployment
- **Package Renaming:** Renamed application to `mars-lantern`.
- **Assets:** Scaled and organized brand iconography into `public/brand/` with cream background tile (`#FBF8F2`) and responsive favicon set.
- **Manifest:** Created `public/manifest.webmanifest`.
- **Routing & Base Path:** Configured Vite base path (`process.env.VITE_BASE ?? '/'`) and integrated `HashRouter` for zero-404 GitHub Pages static hosting.
- **CI/CD:** Automated `.github/workflows/deploy.yml` for static page builds.

### Phase P2: Pure TypeScript Science & Math Core (`src/core/`)
- **Isolation:** Science algorithms separated completely from React/DOM (`src/core/`).
- **Geo Engine (`src/core/geo.ts`):** Great-circle haversine metric distance, coordinate normalizers (East-positive 0°–360°E and display -180°–+180°), and string formatters.
- **Data Schemas (`src/core/types.ts`):** Zod schemas with mandatory provenance badges (`MEASURED`, `NASA-DERIVED`, `MODELED`, `SIMULATED`, `UNKNOWN`).
- **Safe Fetch (`src/core/safeFetch.ts`):** 3-tier cascade (`live` → `cache` → committed `fixture`) with `?offline=1` support for offline demonstrations.
- **Search & Geocoding (`src/core/search.ts`):** Regex parser for decimal, hemisphere (N/S/E/W), and West-longitude coordinate pairs, plus trigram/fuzzy checkpoint and resource search.

### Phase P3: Equirectangular Bounded Map Engine & Layer Registry
- **Engine Rebuild (`src/components/map/MarsMap.tsx`):**
  - CRS: `L.CRS.EPSG4326` (2:1 equirectangular projection matching NASA Trek).
  - Bounds: strictly locked `[[-90, -180], [90, 180]]` with `maxBoundsViscosity: 1.0` and `noWrap: true`.
  - Cursor telemetry throttled to 60 ms with programmatic recenter loop guard (> 20 moves/sec lock).
  - Procedural planetary graticule overlay.
- **Layer Registry Script (`scripts/build-layer-registry.ts`):** Generates `public/data/layers.json` from NASA Trek WMTS capabilities.
- **Fallback Basemap:** Composited `public/tiles/fallback-global.jpg` for complete offline operation and graceful degradation.

### Phase P4: Checkpoint Catalog Migration & Scientific Guardrails
- **Migration Script (`scripts/build-checkpoint-catalog.ts`):** Migrated all existing verified hazards, rovers, and science POIs, and augmented with Spec §6.2 entries (42 validated checkpoints in `public/data/checkpoints.json`).
- **Scientific Guardrails Enforced:**
  - **RSL Flow Rule:** HiRISE findings enforce that Recurring Slope Lineae occur on slopes > 27° and are dry granular avalanches; strictly forbidden from being listed as water-ice resources.
  - **Phoenix Ground Truth:** Phoenix Green Valley recorded as `MEASURED` water-ice site where subsurface ice was exposed.
  - **SWIM Subsurface Ice:** Putzig et al. SWIM data marked as `NASA-DERIVED` shallow ice likelihood zones, not proof.

### Phase P5: DEM Topography, Terrain Scoring, Temperature & Location Report
- **DEM Engine (`scripts/build-dem.py` & `src/core/dem.ts`):**
  - Synthesized 2880×1440 int16 gzipped global elevation grid (1.54 MB) calibrated to MOLA MEGDR laser altimetry.
  - Generates 256×256 regional 128 ppd DEM windows in `public/data/dem/regions/`.
  - Bilinear surface elevation sampling, regional gradient/slope calculation, and roughness index.
- **Deterministic Terrain Scoring (`src/core/terrain.ts`):**
  - Composite penalty formula: `0.45*slopeTerm + 0.25*roughTerm + 0.20*hazardTerm + 0.10*uncertainty`.
  - Hard scientific guardrail: Slopes $\ge$ vehicle limit or RSL slopes (> 27°) marked as strictly non-traversable.
- **Modeled Planetary Temperature (`src/core/temperature.ts`):**
  - NASA Perseverance MEDA anchor at Jezero Crater (-83 °C to +5 °C, 88 K diurnal swing).
  - Labeled engineering estimate with `MODELED` provenance, $\pm 15\,\text{K}$ uncertainty, and low confidence banner.
- **Location Report Engine & UI (`src/core/report.ts` & `LocationReportDrawer.tsx`):**
  - Dynamic `getLocationReport(queryOrCoord, catalog, options)` producing complete terrain, temperature, resource, and hazard dossiers.
  - Interactive right-side drawer with 4-term breakdown visual bars, search radius slider (100–2000 km), and coordinate copy.
  - Interactive pulsing Mars Lantern Beacon marker (`LANTERN_ICON`) with focus halo on the map.
  - Autocomplete search drop-down and category filter chips in `MapControls.tsx`.

### Phase P6: Planetary Routing Engine (A*) & Web Worker (Spec §9.4)
- **Core A* Routing Engine (`src/core/route.ts`):**
  - Pure TypeScript 8-connected A* search over MGS MOLA topography.
  - Edge cost formula: $C = w_d \cdot \text{distance} + w_s \cdot \text{slopePenalty} + w_h \cdot \text{hazard} + w_u \cdot \text{uncertainty}$.
  - Scientific Guardrails: Vehicle maximum slope limits (EVA 15°, unpressurized rover 20°, pressurized rover 25°), RSL slopes (>27°) strictly impassable, unknown-is-impassable default with risk-tolerant override.
  - Computes dual routes: Primary (shortest feasible terrain-aware) vs Alternative (lowest-hazard conservative path).
  - Telemetry: Distance, duration, cumulative elevation climb, max slope, average slope, % high-res coverage, elevation profile.
- **Web Worker (`src/workers/routeWorker.ts`):** Offloads A* search to background thread to ensure zero UI thread stuttering.
- **UI Integration (`useRoutePlanner.ts`, `MarsMap.tsx`):** Connected route planner to core planetary engine and rendered primary & alternative paths on map.

### Phase P7: Mission Builder Wizard & Feasibility Engine (Spec §9.1–§9.3)
- **Simulation Assumptions (`src/config/assumptions.ts`):**
  - Centralized scientific constants for life support, vehicle speeds, slope limits, and reserve margins.
  - Every constant carries `label`, `unit`, `value`, and provenance badge (`SIMULATED ASSUMPTION` or `NASA-DERIVED`).
- **Objectives & Equipment (`src/core/mission/objectives.ts`):**
  - Catalog of 9 mission objectives with durations, payload, power, required tools, allowed vehicles, and daylight needs.
  - Resource validator: alerts users if an objective (e.g. water-ice sampling) is assigned to a stop lacking verified deposits, and points to nearest valid checkpoints.
- **Deterministic Feasibility Evaluator (`src/core/mission/evaluation.ts`):**
  - Formula: $\text{required} = \text{perPersonRate} \times \text{crew} \times \text{durationSols} + \text{allocations} + \text{reserve}$.
  - 4 Separate Scientific Verdicts: Resource, Terrain, Schedule/Daylight, and Data Coverage.
  - Overall Verdict: $\min(\text{Resource}, \text{Terrain}, \text{Schedule}, \text{Data})$ (`FEASIBLE UNDER ASSUMPTIONS`, `FEASIBLE WITH WARNINGS`, `INFEASIBLE`, `INSUFFICIENT DATA`).
  - Actionable "Why" risk factors and "Fix it" recommendations.
- **URL-Hash State Sharing & Export (`src/core/mission/share.ts`):**
  - Zero-backend URL-hash state serialization (`#mission=...`) for instant sharing on GitHub Pages.
  - Markdown field briefing export and structured JSON download.
- **Interactive Wizard UI (`src/components/mission/MissionBuilder.tsx`):**
  - 4-step wizard: Locations $\to$ Objectives $\to$ Crew & Vehicle $\to$ Evaluation & Feasibility Dossier.
  - Integrated into main navigation via `Sidebar.tsx` and `App.tsx`.

### Phase P8: Satellite Panel & Mars Sky Module (Spec §10, §11)
- **Mars Sky Ephemeris Engine (`src/core/sky/mars24.ts`):**
  - Implements Allison & McEwen (2000) Mars24 chain with Clancy et al. calendar epoch (MSD ≈ 28892.6 at MY 1 start).
  - Formulas: $M$ (mean anomaly), $\alpha_{\text{FMS}}$ (fictitious mean sun), 7-term PBS perturbation series, EOC (equation of center), $L_s$ (solar longitude), MSD (Mars sol date), MTC (Airy-0 time), LMST, EOT, LTST (local true solar time), $\delta_{\text{sun}}$ (solar declination), hour angle, and topocentric solar elevation/azimuth.
  - Daylight solver: calculates sunrise LTST, sunset LTST, and daylight window length with midnight sun / polar night edge handling.
  - Natural satellites: models Phobos's super-synchronous orbit (~7.65 h period, rising in the West and setting in the East ~2x per sol) and Deimos (~30.3 h period, rising in East and setting in West).
  - Inferior planet geometry: Earth elongation and morning/evening star appearance.
- **Interactive 2D Canvas Sky Dome (`src/components/sky/MarsSkyCanvas.tsx`):**
  - Atmospheric dust scattering gradient modulated by optical depth ($\tau$, default 0.5, labeled `SIMULATED`).
  - Realistic blue forward scattering halo around the Sun near dawn/twilight (verified by rover observations).
  - Celestial stars mapped from `public/data/stars.json` (75 prominent navigation stars).
  - Phobos, Deimos, and Earth morning/evening star overlays.
- **Mars Sky Panel (`src/components/sky/SkyPanel.tsx`):**
  - Time scrub controls: Now (UTC), $\pm 1$ sol, 24 h LTST scrub slider, play/pause time animation.
  - Telemetry grid: Sol, LTST, LMST, $L_s$, Season, Sun Elevation/Azimuth, Daylight length, Earth Elongation, Moon visibility.
  - Tab 2: Embedded NASA Eyes on the Solar System (`https://eyes.nasa.gov/apps/solar-system/#/mars?embed=true`).
  - Tab 3: Curated celestial science articles (MAVEN auroras, Comet 3I/ATLAS, blue sunset physics).
- **Satellite Intel Panel (`src/components/satellite/SatellitePanel.tsx`):**
  - Layer switcher from `layers.json` (Viking Color, MOLA Hillshade/Elevation, MOC Atlas) with native zoom indicators.
  - Target site Leaflet minimap with tactical range rings: 10 km (EVA limit), 50 km (regional sortie), 100 km (strategic perimeter).
  - Dynamic NASA Image and Video Library search (`https://images-api.nasa.gov/search`) with safe-fetch caching and fallback to `public/data/fixtures/nasa_images_default.json`.

### Phase P9: Survival Center & Field Manual (Spec §12, §16)
- **Survival Center Dashboard (`src/components/survival/SurvivalDashboard.tsx`):**
  - Wired directly to the active mission plan from Mission Builder.
  - Dynamic consumables depletion model: Oxygen ($O_2$), Water ($H_2O$), and Nutritional rations countdown with 85% ECLSS recycling recovery.
  - Point of No Return & Abort Envelope: monitors maximum safe traverse radius and battery solar input.
  - Contingency Malfunction Injection: allows simulating ECLSS membrane degradation (85% $\to$ 30%), global dust storms ($\tau = 3.2$, -95% solar power), and rover drivetrain motor faults.
- **Martian Field Manual (`src/components/manual/FieldManual.tsx`):**
  - Authoritative science articles catalog in `public/data/articles.json` linking geology, resources, hazards, and survival protocols.
  - Filter chips by category (`survival`, `hazards`, `atmosphere`, `geology`).
  - Interactive geospatial ground anchors: clicking a checkpoint navigates directly to that location on the planetary map.

### Phase P10: Local MCP Server & Link Audit (Spec §14, §7.3)
- **Local MCP Server (`mcp/server.ts`):**
  - Built with `@modelcontextprotocol/sdk` and `zod` over stdio transport.
  - Exports 7 core tools sharing pure TypeScript logic from `src/core/`:
    1. `list_checkpoints`: query landmarks and resource zones with bounding box and category filters.
    2. `get_location_report`: complete terrain, temperature, resource, and hazard report for any Mars coordinate or name.
    3. `find_resources_near`: ISRU resource finder within a radius.
    4. `plan_route`: 8-connected A* traverse search over MOLA DEM.
    5. `evaluate_mission`: multi-leg mission feasibility and consumable budget evaluation.
    6. `get_mars_sky`: Mars24 ephemeris and solar geometry calculator.
    7. `search_nasa_images`: dynamic NASA Planetary Image Library queries.
- **Static LLM & Agent Endpoints:**
  - `public/llms.txt`: complete machine-readable interface documentation, schema definitions, and provenance rules.
  - `public/data/manifest.json`: dataset manifest with schema versions, counts, and file formats.
- **Automated Link Audit Script (`scripts/audit-links.ts`):**
  - Audits all external sources in `public/data/sources.json`.
  - Outputs `docs/LINK_AUDIT.md` verifying live network responses and HTTP status codes.

### Phase P11: Accessibility, Responsive, Offline Mode, Final QA & Documentation (Spec §15)
- **Responsive Layout:** Tested down to 360 px viewport width; context drawers and panels adapt smoothly without horizontal overflow.
- **Offline Support (`?offline=1`):** Verified offline mode with `safeFetch.ts` fallback fixtures and prominent `⚡ OFFLINE MODE` badge in `AppHeader.tsx`.
- **Accessibility & Motion:** Respects `prefers-reduced-motion` across Leaflet map transitions and Sky canvas animations; high-contrast status badges (never color-only).
- **Final Test Gate:** All 16 unit test suites passing (80 tests total); clean production bundle build (`tsc && vite build`) in ~12s.

### Phase P12: Complete UI Redesign (Concept Board Visual System)
- **Design Tokens & System (`src/styles/tokens.css`, `tailwind.config.js`):**
  - Full concept board palette implementation: Surfaces `--bg-0` (#0B0D10) through `--bg-3` (#1C2027), `--glass` (`rgba(16,17,20,0.72)` + blur), brand `--mars-rust` (#C65D38), `--mars-orange` (#FF7043), `--lantern-glow` (#FFB070), and scientific `--science-cyan` (#56D9E8).
  - Typography system: Space Grotesk (hero & headings), Inter (body), IBM Plex Mono (telemetry, badges, and SOL clocks).
  - UI Primitives (`src/components/ui/`): Button, GlassPanel, StatCard, RingGauge, ProvenanceBadge, OriginBadge, Tabs/SegmentedControl, Chip, Checklist, Drawer, PageSkeleton.
- **TopBar & Navigation Hierarchy (`src/components/nav/`):**
  - Brand header with rounded cream tile (`#FBF8F2`, radius 12px) and icon.
  - Exactly structured click-to-open accessible navigation menus:
    - **Home ▾**: Mars Layers (`#/map`), Satellite View (`#/satellite`), Mars Sky Dome (`#/sky`).
    - **Mission Planning ▾**: Route Planner (`#/planner/route`), Mission Builder (`#/planner`), Compare Routes (`#/planner/compare`), Mission Briefing (`#/planner/briefing`), Rover Explorer (`#/rovers`).
    - **Survival & Field Manual ▾**: Survival Center (`#/survival`), Field Manual (`#/manual`), Terrain Analysis (`#/terrain`), Hazard Intelligence (`#/hazards`), Science Targets (`#/science`), Weather Telemetry (`#/weather`).
  - Active Mission Clock chip with real-time solar time (`calculateMarsSky`) and Ls/season popover.
  - SideRail for desktop quick-access and BottomTabs for mobile viewports (< 768px).
- **Core Views Implemented:**
  - `LandingPage` (Concept Panel 01): Full-viewport Mars landscape hero, EXPEDITION 001 eyebrow, YOUR LIFE ON MARS header, 3-stat strip with provenance badges, Today on Mars telemetry card, and feature cards.
  - `MapPage` (Concept Panel 02): 320px left panel with Terrain/Elevation/Hazard segmented control, search, filter chips, and Selected Location card, wrapping the bounded equirectangular map engine.
  - `SurvivalPage` (Concept Panel 03): Status pill, 3 animated RingGauges (Oxygen, Water, Food), 3 StatCards (Habitat Pressure, Temperature, Radiation), and persistent Daily Checklist.
  - `FieldManualPage` (Concept Panel 04): 5-topic handbook, KEY POINTS glass card, Related Equipment cards, and interactive location chips.
  - `PlannerPage` (Concept Panel 05): 3-column expedition planner with destination selector, equipment checklist, route canvas, and Mission Overview with consumable budgets and feasibility verdicts.
  - Route Planner, Compare Routes, Mission Briefing, Rover Explorer, Terrain Analysis, Hazard Intelligence, Science Targets, Weather Telemetry, Satellite View, and Sky Dome.
- **Scientific Guardrails Maintained:**
  - Zero hardcoded concept numbers; every numerical readout carries a provenance badge (`MEASURED`, `NASA-DERIVED`, `MODELED`, `SIMULATED`, `UNKNOWN`).
  - No changes to `src/core/`, `mcp/`, `scripts/`, or data schemas.

### Phase P13: Basemap Tile Error Threshold, Direct Map Route Selection, and Popup Stacking Isolation
- **Basemap & Elevation Mode Stabilization (`MarsMap.tsx`, `useMarsLayers.ts`, `MapPage.tsx`):**
  - Raised tile error trip threshold from 5 to 12 errors to prevent transient multi-tile load bursts on slow networks from prematurely triggering offline fallback.
  - Added `maxNativeZoom={activeBaseLayer.maxZoom}` to base and overlay `<TileLayer>` components to prevent Leaflet from querying non-existent server tile levels when zooming past layer limits.
  - Added manual "Retry" connection button to the offline fallback banner.
  - Added deterministic `setActiveBaseLayer()` callback in `useMarsLayers.ts` and wired it into `MapPage.tsx` mode toggling (Terrain / Elevation / Hazard) to avoid accidental layer inversion.
- **Direct Map Click Route Selection (`RoutePlannerPage.tsx`):**
  - Introduced interactive `clickMode` state (`'start' | 'dest'`) allowing users to click directly on the map to set either Origin (Start) or Target (Destination).
  - Added auto-advance feature (selecting Origin automatically prompts for Destination).
  - Styled clickable origin/destination parameter cards in the sidebar and added a floating map mode indicator badge (`z-30`).
- **Popup Stacking Context Isolation (`index.css`, `MarsMap.tsx`):**
  - Resolved Leaflet popup pane (`z-index: 700`) bleeding over UI control aside panels (`z-20`) by applying `isolation: isolate` to `.leaflet-container` in `src/styles/index.css` and the outer map wrapper div in `MarsMap.tsx`.

### Phase R1: Geodesy Math Additions & Tests
- **Geodesic Engine Extensions (`src/core/geo.ts`):**
  - Added `LatLonE` interface as universal coordinate reference with Areocentric east-positive longitude.
  - Implemented `greatCircleArc(a, b, stepKm, maxPoints)` using spherical unit-vector slerp with boundary safeguards.
  - Implemented `splitArcAtAntimeridian(arc)` for equirectangular map polyline splitting to prevent wrap-around visual artifacts.
  - Added `initialBearingDeg` (with dual function overloads supporting coordinate objects and discrete numbers, plus spherical shortest wrap across 0°/360°) and `finalBearingDeg`.
  - Added `destinationPoint(a, bearingDeg, distKm, R)` for direct geodetic forward projection.
  - Added `crossTrackKm(p, a, b, R)` for perpendicular cross-track distance to great-circle arcs.
  - Added `pointToSegmentDistanceKm(p, a, b, R)` for finite segment distance calculations with endpoint projection clamping.
  - Added dual overloads to `haversineKm` supporting both `(a: LatLonE, b: LatLonE)` and `(lat1, lon1, lat2, lon2)`.
- **Unit Testing Suite (`tests/geo.test.ts`):**
  - Added unit tests for analytical 1° equator distance ($2\pi R / 360 \approx 59.16\,\text{km}$).
  - Added tests for bearings with 0°/360° wraps (e.g. $355^\circ\text{E} \to 5^\circ\text{E}$ is due East $90^\circ$).
  - Added tests for `destinationPoint`, great-circle slerp interpolation, antimeridian splitting, right-angle cross-track distance, and pole singularities (87/87 tests passing).

### Phase R2: DEM Engine, Horn Slope, Detrended Roughness, and Derived Rasters
- **Terrain Analysis Engine (`src/core/dem/terrainAnalysis.ts`):**
  - Implemented Horn's method ($3\times 3$ window with $1-2-1$ convolution weighting) for topographic slope and aspect.
  - Implemented latitude-aware metric cell scaling ($\Delta x = R \cos\phi \Delta\lambda_{\text{rad}}$ clamped at $|\phi| \le 89^\circ$ to prevent polar singularities).
  - Implemented strict nodata rule: if any of the 9 cells in the $3\times 3$ kernel contains nodata, slope is null and `hasData: false`.
  - Implemented $5\times 5$ planar detrending for surface roughness: fits a least-squares plane $z(u, v) = c_0 + c_x u + c_y v$ and computes the standard deviation of residuals ($\sigma_{\text{detrended}} \to 0$ on smooth ramps).
  - Added `computeDerivedRasters` to generate `slopeU8` (0–90°, 255 = nodata), `roughU8` (0–255 mapped to 0–510 m), and `maskU8` (bits 0: valid, 1: polar distortion).
- **DEM Tile Store (`src/core/dem/demStore.ts`):**
  - Created `DemStore` multi-resolution tile cache with injectable loaders.
  - Implemented strict bilinear interpolation: returns interpolated height only when all 4 surrounding corner grid cells are valid (null if any corner is nodata).
- **ETL Derived Raster Generation (`scripts/build-dem.py`):**
  - Extended regional tile generation in Python to emit `_derived.bin` containing `slope_u8`, `rough_u8`, and `mask_u8` bytes alongside raw int16 tiles.
- **Unit Testing Suite (`tests/terrainAnalysis.test.ts`):**
  - 8 new unit tests covering: flat plane ($0^\circ$), 20m/100m ramp ($11.31^\circ \pm 0.05^\circ$), aspect directions (E/W/N/S), single-cell nodata propagation across all 8 neighbors, $\cos(60^\circ) = 0.5$ metric scaling ratio, detrended roughness on smooth ramp ($\to 0$), and DemStore strict bilinear sampling (95/95 tests passing).

### Phase R3: Traversability Classes, Vehicle Limits, Data-Gap Policy & Settings Display
- **Traversability Engine (`src/core/dem/traversability.ts`):**
  - Implemented 5 traversability classes per Spec §7.3: `FAVOURABLE`, `CAUTION`, `HIGH_RISK`, `NON_TRAVERSABLE`, `UNKNOWN`.
  - Enforced strict vehicle mobility limits (EVA: 15° max, unpressurized rover: 20°, pressurized rover: 15°).
  - Enforced scientific guardrails: RSL steep terrain (> 27°) is permanently non-traversable for all vehicles; UNKNOWN data gaps are impassable by default ($\text{cost} = \infty$).
  - Implemented risk-tolerant crossing policy: unknown cells crossable at $w_u \cdot \text{GAP\_COST}$ ($8\times$ baseline favourable cost) with mandatory low confidence flags.
  - Implemented `calculateCellBaseCost` and `buildCostRaster` evaluating quadratic slope penalty $(s / \text{limit})^2$, roughness penalty, hazard penalties, and data uncertainty.
- **Assumptions & Settings Configuration (`src/config/assumptions.ts`):**
  - Aligned vehicle slope limits and added caution band minimums.
  - Added routing cost weights ($w_d = 1.0, w_s = 4.0, w_r = 1.5, w_h = 6.0, w_u = 2.0$) and gap multiplier.
  - Implemented `updateAssumptionValue` and `resetAssumptionsToDefaults` state functions.
- **Settings & Assumptions UI (`src/components/common/SettingsModal.tsx`, `TopBar.tsx`):**
  - Created accessible `SettingsModal` displaying all mission constants categorized with `SIMULATED ASSUMPTION` provenance badges.
  - Supported inline editing of numeric values with validation and one-click "Reset to defaults".
  - Added header quick-access Settings icon button in `TopBar.tsx`.
- **Unit Testing Suite (`tests/traversability.test.ts`):**
  - 8 new unit tests covering: boundary test at exactly the vehicle slope limit, strict UNKNOWN impassability and risk-tolerant override, RSL > 27° blocking, caution band top 1/3 bracket, roughness thresholds (150m vs 300m), quadratic cost raster calculations, and assumption updates/resets (103/103 tests passing).

---

## Verification Status
- **Test Suite:** 18 vitest test suites, 103 passing unit tests (`npm test`).
- **Production Build:** Clean TypeScript compilation and Vite minification with zero errors (`npm run build`).
- **Runtime Verification:** Local static preview served cleanly on port 4173 with complete route lazy loading.




