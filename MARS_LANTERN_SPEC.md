# MARS LANTERN — Update Specification for Antigravity IDE
**Formerly:** ARES / Interplanetary Survival Guide: Martian Map
**Challenge:** NASA Space Apps 2026 — *Interplanetary Survival Guide: Martian Map* (Challenge 11)
**Document version:** 1.0 · written 17 Oct 2026 · target: live GitHub Pages web app + local MCP server

> **How to use this file.** Put it in the repo root as `MARS_LANTERN_SPEC.md` (and copy the "Agent rules" section into `AGENTS.md` / `CLAUDE.md`). Paste the **Master Prompt (Section 18)** into Antigravity. Everything else is the reference the agent reads.

---

## 0. Read this first: honesty about what was and wasn't verified

| Item | Status |
|---|---|
| Your uploaded config files (`package.json`, `vite.config.ts`, `README.md`, etc.) | Read. The `src/` folder was **not** uploaded, so the cause of the infinite map loop is diagnosed from symptoms (Section 3), not from your code. Antigravity must confirm it. |
| NASA Trek WMTS rules, MEDA temperature note, RSL (recurring slope lineae) article, SWIM ice project, USGS/MOLA/Viking mosaic pages | Opened and read. |
| Remaining links in `resource_link`, `resource_link_2`, `mouly_resource` | Catalogued in Section 7 with intended use. **Not all opened.** Section 7.3 contains a link-audit script so the agent verifies every URL at build time. |
| Exact Trek tile URLs | **Not confirmed.** Trek's docs say layer names must come from each layer's WMTS `GetCapabilities`. Section 5.2 builds the layer registry from `GetCapabilities` instead of hard-coding guesses. |
| Checkpoint coordinates marked `"coordSource": "memory-verify"` | From general mission knowledge. The agent must cross-check each against its NASA page before release. Coordinates from your uploaded PDFs are marked `"project-pdf"`. |
| Temperature model | **A labelled engineering estimate**, anchored to one NASA-published range. Not a measurement. |

Rule for the whole app: **every number on screen carries a provenance badge** — `MEASURED` · `NASA-DERIVED` · `MODELED` · `SIMULATED` · `UNKNOWN`. Nothing unknown may be rendered as safe.

---

## 1. What changes in this release

| # | Requirement from you | Deliverable |
|---|---|---|
| 1 | Map is an infinite loop → make it static, stable, more detailed | New equirectangular map engine, bounded, no wrap, no re-render loop (§3–§5) |
| 2 | More checkpoints: minerals, water, ice | Checkpoint catalog, 40+ entries, typed resource categories (§6) |
| 3 | Type a location → terrain quality, temperature, nearby resources, routes | `getLocationReport()` + Location Report panel + search parser (§8) |
| 4 | Use the source links and exact locations in my files | Source registry + catalog seeded from files (§6–§7) |
| 5 | Build-your-own mission from chosen locations | Mission Builder (§9) |
| 6 | Satellite view function, dynamic from NASA | Satellite module (§10) |
| 7 | Mars sky function, dynamic | Mars Sky module (§11) |
| 8 | Deployable on GitHub Pages + MCP server access | Static build + shared core + MCP server (§13–§14) |
| 9 | Name: **MARS LANTERN**, icon = uploaded image | Branding (§2) |
| 10 | UI close to the pasted plan but more functional | UI map (§12) |
| 11 | Detailed documentation for Antigravity | This file |

---

## 2. Branding

- **Name:** MARS LANTERN. Tagline: *"Carry the light. Read the planet."*
- **Icon:** the open-book-with-astronaut-and-Mars image. Delivered alongside this file in `brand/`:
  `mars-lantern-icon.png` (1024), `icon-512.png`, `icon-192.png`, `icon-180.png` (Apple touch), `icon-64.png`, `icon-32.png`, `favicon.ico`.
- Copy to `public/brand/`. The icon has a **white/cream background** and navy/orange art, so on the dark UI always place it on a rounded cream tile (`#FBF8F2`, radius 12px) in the top bar, not directly on `#0B0D10`.
- Update `index.html`:
```html
<title>MARS LANTERN — Martian Survival Atlas</title>
<link rel="icon" href="%BASE_URL%brand/favicon.ico" sizes="any" />
<link rel="icon" type="image/png" sizes="32x32" href="%BASE_URL%brand/icon-32.png" />
<link rel="apple-touch-icon" href="%BASE_URL%brand/icon-180.png" />
<link rel="manifest" href="%BASE_URL%manifest.webmanifest" />
<meta name="theme-color" content="#0B0D10" />
<meta property="og:title" content="MARS LANTERN" />
<meta property="og:image" content="brand/icon-512.png" />
```
- Rename in `package.json` (`"name": "mars-lantern"`), README title, top bar (`MARS LANTERN` + small `FIELD ATLAS`), and the footer.
- Design tokens: keep the palette from the earlier plan (`--bg-primary #0B0D10`, `--mars-orange #F08A50`, status green/amber/red, cyan for science). Add `--lantern-glow: #FFB070` for focus rings and the active-checkpoint halo. Fonts: Space Grotesk (headings), Inter (body), IBM Plex Mono (telemetry). Self-host fonts in `public/fonts/` so the app works offline; keep the Google Fonts link only as a fallback.

---

## 3. Fixing the "infinite loop" map

You said the map "is just an infinite loop." There are two common causes; Antigravity must test both.

### 3.1 Cause A — world-wrap in Leaflet (visual loop)
Leaflet's default CRS is Earth Web-Mercator and its tile layers **wrap horizontally forever**. A Mars equirectangular mosaic then repeats side to side and the user can pan endlessly. Symptoms: map repeats left/right, markers duplicate, panning never stops.

**Fix (mandatory):**
1. Use an equirectangular CRS: `L.CRS.EPSG4326`. At zoom 0 it is 2 tiles wide × 1 tall, matching Trek's equirectangular WMTS ("first zoom level … two columns and one row", per the Trek API page).
2. `noWrap: true` on every tile layer, `bounds: [[-90,-180],[90,180]]`.
3. `maxBounds` = same bounds with `maxBoundsViscosity: 1.0`, and `worldCopyJump: false`.
4. Set `minZoom: 1`, a sensible `maxZoom` from the layer registry (default 7), and `zoomSnap: 0.5`.
5. Wrap longitudes only in math code (`normalizeLon`), never by letting the map pan.

### 3.2 Cause B — React render/effect loop (logic loop)
Symptoms: CPU spikes, the map keeps re-centring, "Maximum update depth exceeded", tiles flicker. Typical culprits in React-Leaflet apps:
- `<MapContainer center={[..]} />` or `bounds` props rebuilt each render (they are only read once, but recreated objects passed to children trigger effects).
- `useEffect(() => { map.fitBounds(...); setState(...) }, [state])` where `fitBounds` fires `moveend` which sets state again.
- A `useMap()` child calling `map.setView` in an effect with unstable dependencies.
- Route recompute inside render, updating state that re-triggers the route.

**Fix (mandatory):**
- Create the Leaflet map **once** in an imperative `useRef` wrapper (`MarsMap.tsx`), not by re-rendering `MapContainer`. Expose a small imperative API: `flyTo`, `setLayers`, `setMarkers`, `setRoute`, `invalidateSize`.
- Map events → a **single** debounced store action (`setViewport`), and the map never reads viewport back to move itself unless the change came from a user action flagged `source: 'ui'`.
- Memoize all arrays/objects passed as props; compute routes in a worker, triggered by an explicit **Calculate** click, never an effect on every state change.
- Add a dev-only guard: count `moveend` events per second; if > 20, `console.error('MAP LOOP DETECTED')` and break.

### 3.3 Diagnosis checklist for the agent (do this first)
1. Open DevTools → Performance, record 5 s on the map page. Note repeating `fitBounds`/`setView`/`setState`.
2. Pan hard left: if the same landmass reappears, it is Cause A.
3. Search the code for `worldCopyJump`, `noWrap`, `fitBounds`, `setView`, `flyTo`, and effects with `useMap`.
4. Write the finding in `docs/MAP_LOOP_ROOT_CAUSE.md` before changing code.

### 3.4 Coordinate calibration test (blocks release)
Plot a marker at **Olympus Mons summit ≈ 18.65°N, 226.2°E** (display lon = −133.8°). It must sit on the volcano. Also test **Jezero ≈ 18.44°N, 77.45°E** and **Gale (Bradbury Landing) ≈ 4.59°S, 137.44°E**. If any is off by more than ~1°, the longitude convention is wrong (see §4).

---

## 4. Coordinate conventions (one place, one module)

Mars uses **planetocentric** latitude and **east-positive longitude 0–360°** in most NASA products, while some basemaps use −180…180. Create `src/core/geo.ts` as the only place conversions happen.

```ts
export const MARS_RADIUS_KM = 3389.5; // mean radius, as in the existing README

export const normalizeLon360 = (lon: number) => ((lon % 360) + 360) % 360;
export const lon360ToDisplay = (lon: number) => { const l = normalizeLon360(lon); return l > 180 ? l - 360 : l; };
export const clampLat = (lat: number) => Math.max(-90, Math.min(90, lat));

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number, R = MARS_RADIUS_KM) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
```
- Internally store `lat`, `lonE` (0–360, east-positive). Convert to display lon only for Leaflet.
- Input parser accepts: `18.44, 77.45` · `18.44N 77.45E` · `18.44°N 282.55°W` · `-4.59, 137.44` · `Jezero` · `Gale Crater` (see §8.2).
- Unit tests required for 0/360 wrap, antimeridian, poles.

---

## 5. Map engine and layers

### 5.1 Stack
Keep Leaflet 1.9 (already installed). Add:
- `leaflet.markercluster` (clustering many checkpoints) · `leaflet-minimap` is optional · no new map framework.
- MapLibre is **not** needed. Do not introduce a second map library.

### 5.2 Layer registry built from GetCapabilities (do not guess tile URLs)
NASA's Trek page states tile URLs follow `https://{WMTS endpoint}/1.0.0/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png` (or `.jpg`) and that style, matrix set, and extension must be read from each product's `GetCapabilities` XML; missing tiles mean no coverage, not necessarily an error.

Write `scripts/build-layer-registry.ts`:
1. Fetch the Mars Trek capabilities XML for each wanted product (start from `https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars`, follow its per-product `GetCapabilities` links; also NASA's catalog at `https://api.nasa.gov/mars-wmts/catalog`).
2. Parse `ows:Identifier` (Layer, Style, TileMatrixSet), `ResourceURL` template, `ows:WGS84BoundingBox`, and max TileMatrix.
3. Emit `public/data/layers.json`:
```jsonc
{
  "id": "viking-color",
  "title": "Viking Color Mosaic (global)",
  "kind": "satellite",            // satellite | elevation | slope | geology | polar
  "urlTemplate": "<from ResourceURL, with {z}/{y}/{x}>",
  "tileSize": 256, "minZoom": 0, "maxNativeZoom": 6,
  "bbox": [-180,-90,180,90],
  "projection": "equirectangular",
  "attribution": "NASA/JPL/USGS · Mars Trek",
  "provenance": "NASA-DERIVED",
  "verifiedOn": "2026-10-xx"
}
```
4. Commit `layers.json` and a **fallback** so the app still works if Trek is down (see §5.4).

Products to look for in the Trek Mars list (names reported in NASA's API catalog): **Viking Color Mosaic – Global**, **Color Hillshade – MOLA** (elevation/shaded relief), **MOC Atlas Mosaic**, **HRSC Color Mosaic (MC11, Mawrth Vallis)**, **HiRISE Mosaic (ESP_040776_2115)**. Use whichever resolve in `GetCapabilities`.

Source datasets behind them (cite these in the UI): USGS Astrogeology *Mars Viking Colorized Global Mosaic 232 m* (colorized by NASA Ames over MDIM 2.1), *Mars MGS MOLA Global Shaded Relief 463 m*, *Mars MGS MOLA DEM 463 m* (`planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif`).

### 5.3 Map features (all must work)
- Base layers (radio): Viking color, MOLA shaded relief, MOLA elevation color.
- Overlays (toggle): checkpoints (clustered, filter chips by resource type), rover traverses, hazards, ice-likelihood zones, planned route, user waypoints, graticule (lat/lon lines every 30°), scale bar in km, cursor lat/lon/elevation readout.
- Polar view: Trek provides North/South Pole stereographic services; add a "Polar" tab with a second small map (`L.CRS.Simple` or Proj4Leaflet) only if time permits. Otherwise show polar checkpoints in the equirectangular view and note distortion near ±90°.
- Search box (§8), "Locate by coordinates" input, "Go to checkpoint" list.
- Click anywhere → opens Location Report (§8) with a pulsing lantern marker.
- Max zoom limited to data resolution; show a **"Beyond data resolution"** badge instead of blurry upscaling.
- `prefers-reduced-motion`: replace `flyTo` with `setView`.

### 5.4 Offline / failure behaviour
- Fallback basemap: a pre-rendered 4096×2048 JPEG of the global mosaic in `public/tiles/fallback-global.jpg`, shown with `L.imageOverlay` when tile requests fail ≥ 5 times. Show a "Cached basemap — detailed tiles unavailable" banner.
- Use the guide's **live → cache → fixture** rule for all fetches (§7.4).

---

## 6. Checkpoint system

### 6.1 Schema (`src/core/types.ts`, validated with Zod)
```ts
export type ResourceType =
  | 'water_ice' | 'hydrated_minerals' | 'clay_minerals' | 'sulfates' | 'iron_oxides'
  | 'basaltic_regolith' | 'volcanic' | 'carbonates' | 'co2_atmosphere' | 'metals_meteorite';
export type CheckpointKind = 'landing_site' | 'resource_zone' | 'science_site' | 'hazard' | 'landmark';
export type Provenance = 'MEASURED' | 'NASA-DERIVED' | 'MODELED' | 'SIMULATED' | 'UNKNOWN';

export interface Checkpoint {
  id: string;                    // kebab-case, stable
  name: string;
  kind: CheckpointKind;
  lat: number; lonE: number;     // planetocentric, east-positive 0–360
  coordConfidence: 'exact' | 'approx' | 'region';
  coordSource: 'project-pdf' | 'nasa-page' | 'memory-verify';
  radiusKm?: number;             // for zones
  resources: { type: ResourceType; detail: string; quantity?: string; provenance: Provenance }[];
  hazards?: { label: string; detail: string; provenance: Provenance }[];
  surfaceFacts?: { label: string; value: string; unit?: string; provenance: Provenance }[];
  rover?: 'Curiosity' | 'Perseverance' | 'Opportunity' | 'Spirit' | 'Viking' | 'Phoenix' | 'InSight' | 'Pathfinder';
  summary: string;
  sources: { title: string; url: string; retrieved?: string }[];
  fieldManualSlug?: string;
}
```
**Rule:** a checkpoint with `provenance: 'UNKNOWN'` is rendered grey with a "?" icon. Never default a missing value to "safe".

### 6.2 Seed catalog — `public/data/checkpoints.json`
**Migrate first.** Before adding anything, read the existing hazards/rovers/science data already in `src/` (Jezero Delta Front Escarpment, Kodiak Mesa, Bagnold Dunes, Olympus Mons Basal Scarp, Curiosity/Perseverance milestones) and keep their coordinates. Then add the entries below.

**A. From your uploaded PDFs (`coordSource: "project-pdf"`)**

| id | Place | Lat / Lon | Resource facts (from your PDFs) |
|---|---|---|---|
| `mawrth-vallis` | Mawrth Vallis | 24.7°N, 339.5°E | Fe/Mg clays at base; Al-clays above; hydrated silica + ferrous-iron phase (CRISM, 21 Sep 2007). No wt% published in that release. |
| `crism-crater-floor-wall` | Crater floor & wall target | 10.65°S, 98.22°E | Fe-Mg clays, olivine (CRISM) |
| `crism-escarpment-slope` | Escarpment slope target | 22.06°N, 74.63°E | Fe-Mg clays, Al-clays, olivine (CRISM). Lies in the Nili Fossae/Syrtis region — verify naming. |
| `gusev-plains` | Gusev plains (Adirondack-class) | ≈14.57°S, 175.48°E *(landing site; memory-verify)* | Unaltered olivine basalt: plagioclase 39 %, olivine 20 %, low-Ca pyroxene 15 %, augite 15 % (Adirondack norm) |
| `gusev-columbia-hills` | Columbia Hills (Clovis, Paso Robles) | ≈ Gusev area, `coordConfidence: approx` | Goethite up to 40 % of Fe in Clovis (aqueous alteration); ~65 % of Fe as Fe³⁺-sulfate in Paso Robles soil |
| `meridiani-planum` | Meridiani Planum | ≈1.95°S, 354.47°E *(Opportunity landing; memory-verify)* | Gray crystalline hematite up to 20 wt% (orbital TES); hematite "blueberries"; goethite precursor in basaltic sandstone |
| `gale-rocknest` | Rocknest, Gale Crater | ≈4.6°S, 137.4°E *(approx)* | Soil ≈55 wt% crystalline basaltic + ≈45 wt% X-ray amorphous (volatile host: H₂O, SO₂, CO₂, O₂, Cl). Plagioclase 22.3 %, olivine 12.3 %, augite 8.0 %, pigeonite 7.6 %, magnetite 1.2 %, anhydrite 0.8 % (bulk) |

**B. Landing/rover anchors (`memory-verify` → verify against NASA mission pages)**
`jezero-perseverance` (18.44°N, 77.45°E) · `gale-bradbury-curiosity` (4.59°S, 137.44°E) · `eagle-crater-opportunity` · `gusev-spirit` · `viking-1-chryse` (≈22.3°N, 312.1°E) · `viking-2-utopia` (≈47.6°N, 134.3°E) · `phoenix-green-valley` (≈68.2°N, 234.3°E; **ice exposed under lander** — a measured water-ice site) · `insight-elysium` (≈4.5°N, 135.6°E) · `pathfinder-ares-vallis` (≈19.1°N, 326.8°E).

**C. Water-ice zones** (`kind: resource_zone`, `coordConfidence: region`)
- SWIM regions: **Arcadia Planitia, Acidalia Planitia, Deuteronilus Mensae, Utopia Planitia** — NASA-funded Subsurface Water Ice Mapping (PSI, Putzig & Morgan) combines radar, thermal, neutron, altimetry and image data to map likelihood of shallow ice, assessing above/below 5 m depth. Use as *likelihood zones*, never as proof. Authoritative maps: `swim.psi.edu`.
- North polar cap/layered deposits (≈85–90°N) and south polar layered deposits (≈85–90°S).
- Mid-latitude glacier-like forms in Deuteronilus Mensae (SHARAD radar evidence — verify citation).
- Korolev Crater (≈73°N, 165°E) — ice-filled crater (ESA Mars Express imaging; mark source ESA).

**D. Mineral/geology sites:** Nili Fossae (clays/carbonates), Syrtis Major (basaltic volcanic), Jezero delta (clays + carbonates), Comanche outcrop (Spirit, carbonate-rich; from your link), Egg Rock iron-nickel meteorite (Curiosity; metal), Finger-like cemented rocks (Curiosity), Curiosity's first 14 sample sites, Olympus Mons (Tharsis volcanic), Hellas Planitia (lowest basin), Valles Marineris (canyon).

**E. Hazards:** Jezero delta front escarpment, Kodiak mesa precipice, Bagnold Dunes, Olympus Mons basal scarp, Valles Marineris walls, **RSL slopes** (see below), dust-devil terrain (Jezero, MEDA).

**F. Global "everywhere" resource:** `co2_atmosphere` — Mars's atmosphere is the oxygen feedstock demonstrated by Perseverance's MOXIE (verify citation on NASA's MOXIE page). Render as a global badge, not a map point.

> **RSL warning (NASA, read):** Recurring slope lineae were once described as possible flowing water, but NASA/USGS HiRISE analysis of 151 features found them almost entirely on slopes steeper than ~27° matching the dry angle of repose, so they are better matched to **granular (dry) flows**; hydrated salts are present at some sites, but the origin remains puzzling. **Do not list RSL as a water resource.** List them as a *hazard/science site with `water_status: contested`*.

### 6.3 Resource-around-a-point scoring
`resourcesNear(lat, lonE, radiusKm)` returns checkpoints sorted by haversine distance, plus **zone membership** (point inside a `resource_zone` radius/bbox). Output per resource type: nearest distance, count, best evidence level (`MEASURED` > `NASA-DERIVED` > `MODELED`).

---

## 7. NASA data sources

### 7.1 Source registry (`public/data/sources.json`, rendered in the About page and every panel's "Sources")
| Purpose | Source | Access | Notes |
|---|---|---|---|
| Basemap tiles | NASA Mars Trek WMTS (`trek.nasa.gov/tiles/…`) | Browser, no key | Read layer details from GetCapabilities |
| Base mosaics | USGS Astrogeology Viking color 232 m; MOLA shaded relief 463 m | Build-time download | Planetary maps hosted at `planetarymaps.usgs.gov` |
| Elevation | MGS MOLA DEM 463 m (PDS Geosciences MEGDR) | **Build-time ETL → static binary** | Not fetched in browser |
| Water-ice | SWIM (PSI/NASA) | Reference + static zones | `swim.psi.edu` |
| Rover tracks | PDS PLACES `MSL-M-ROVER-6-RDR-PLACES-V1.0`; NASA Perseverance/Curiosity location maps | Build-time ETL | Your README already lists these |
| Spirit/Opportunity tracks | NASA Photojournal traverse maps (your links) | Static GeoJSON hand-digitised or exported | Cite image PIA ids |
| Images by place | NASA Image & Video Library API (`images-api.nasa.gov/search`) | Browser, no key | Respect credits |
| Daily image / rover photos | `api.nasa.gov` APOD, Mars Rover Photos | Key (`DEMO_KEY` 30/hr, 50/day; free key 1,000/hr) | Wrap in safe-fetch; rover-photos endpoint may change — verify at build |
| Temperature anchor | Perseverance MEDA (NASA blog): surface ≈ −83 °C pre-dawn to ≈ 5 °C at noon; air ≈ −83 to −23 °C (Jezero) | Citation | Used as model anchor only |
| Sky ephemeris | NASA GISS/Ames Mars24 algorithm (Allison & McEwen 2000); IAU Mars rotation constants | In-code | Deterministic |
| 3D orbit/sky view | NASA Eyes on the Solar System: `https://eyes.nasa.gov/apps/solar-system/#/mars?embed=true` | iframe | From your resource file |
| Literature | NTRS (`ntrs.nasa.gov/api/citations/search`), NASA ADS | Build-time/fixture | Field Manual references |

### 7.2 Your resource links → where each is used
Strip `?utm_source=chatgpt.com` from every URL before storing.
| Link (from your files) | Use in MARS LANTERN |
|---|---|
| Daily records of atmospheric temperature with Perseverance | Temperature anchor + Field Manual "Mars temperature" (read) |
| Perseverance location map / Curiosity mission page / Opportunity final traverse / Spirit prime-mission traverse | Rover-track layer + checkpoint sources |
| Olympus Mons ("Tharsis volcano") | Checkpoint `olympus-mons` |
| Measuring the age of a rock on Mars | Field Manual (Curiosity geochronology) + Gale checkpoint |
| Comanche Rock Outcrop (JPL) | Spirit carbonate checkpoint |
| Egg Rock meteorite | Curiosity metal checkpoint |
| Finger-like cemented rocks | Curiosity science site |
| Black Beauty — NWA 7034 | Field Manual: Martian crust water (an Earth-found meteorite — not a map point) |
| Curiosity's first 14 sampling sites | Gale sample-site checkpoints |
| MMX/MEGANE, MAVEN (farewell, solar-wind stripping, aurora, sputtering), storm chasers, comet 3I/ATLAS, "liquid water flows" (see RSL correction), RSL "flowing sand" (read), HiRISE site, MRO page | Field Manual + Sky page "Mars in the news"; HiRISE link on Satellite page |
| Eyes on the Solar System | Embedded in Sky page |

### 7.3 Link audit script (required)
`scripts/audit-links.ts`: read `sources.json`, `HEAD`/`GET` each URL with a 15 s timeout, write `docs/LINK_AUDIT.md` (OK / redirect / failed + date). CI fails if a **primary** source (flagged `critical: true`) is dead. This replaces any claim that "all links were read" — the report is the evidence.

### 7.4 Safe-fetch (port of your `project_instruction`)
```ts
// src/core/safeFetch.ts — live first, cache second, committed fixture last. Never throws during a demo.
export type Origin = 'live' | 'cache' | 'fixture';
const OFFLINE = new URLSearchParams(location.search).get('offline') === '1';

export async function fetchJson<T>(url: string, fixturePath?: string, timeoutMs = 15000): Promise<{ data: T; origin: Origin }> {
  const key = 'ml:' + url;
  if (!OFFLINE) {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs);
      const r = await fetch(url, { signal: ctl.signal }); clearTimeout(t);
      if (!r.ok) throw new Error(String(r.status));
      const data = (await r.json()) as T;
      try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), data })); } catch {}
      return { data, origin: 'live' };
    } catch {}
  }
  try { const c = localStorage.getItem(key); if (c) return { data: JSON.parse(c).data as T, origin: 'cache' }; } catch {}
  if (fixturePath) { const r = await fetch(import.meta.env.BASE_URL + fixturePath); if (r.ok) return { data: await r.json(), origin: 'fixture' }; }
  throw new Error('No live, cache or fixture data for ' + url);
}
```
Show a small badge (`LIVE`, `CACHED`, `FIXTURE`) beside every dynamic panel. Add `?offline=1` demo mode. Per the Space Apps guide: the demo must run with the wifi off.

### 7.5 Scheduled data refresh (what makes it "dynamic" on a static site)
`.github/workflows/refresh-data.yml` (cron weekly + manual): runs ETL scripts that fetch APOD, NASA Image Library results for each checkpoint, rover-track GeoJSON (if reachable), and re-validate links; commits changes under `public/data/`. The browser additionally makes live calls (images, APOD) through safe-fetch.

---

## 8. Location system and Location Report

### 8.1 What the user can do
Type or click a location → get a **Location Report** with: coordinates (both lon conventions), nearest named feature, elevation, local slope, terrain-quality score, temperature estimate, resources within radius (default 500 km, slider 100–2000), hazards nearby, available routes to nearby checkpoints, current sky snapshot, imagery, and data-confidence.

### 8.2 Search / geocoder (`src/core/search.ts`)
1. Try coordinate regexes (decimal, hemisphere letters, W longitudes → convert to E).
2. Else fuzzy match (Fuse.js or a small trigram scorer) over `name`, aliases, rover, and resource types (typing "ice" lists ice sites).
3. Return top 8 with type icons. Enter key = best match. Invalid → inline error, never crash.
4. Unit tests: `"18.44N 77.45E"`, `"-4.59, 137.44"`, `"18.65, -133.8"`, `"jezero"`, `"ice"`, garbage.

### 8.3 Data inputs for the report
- **Elevation/slope:** MOLA DEM ETL (see 8.4). Slope = local gradient over a 3×3 window; also report roughness (std-dev of elevation in a 5×5 window).
- **Coverage flag:** if the point is outside the high-res regional windows, say "Coarse global data (~7 km/px). Slope is not rover-scale."

### 8.4 DEM ETL (`scripts/build-dem.py`, build-time, Python + rasterio)
- Input: `Mars_MGS_MOLA_DEM_mosaic_global_463m.tif` (USGS).
- Output A: **global grid** at 8 px/deg (2880×1440, int16 metres, gzip) → `public/data/dem/global_8ppd.bin.gz` + `.json` header (lat/lon origin, scale, nodata).
- Output B: **regional windows** 2°×2° at 128 px/deg (256×256 int16 ≈ 128 KB each) for every checkpoint → `public/data/dem/regions/{id}.bin`.
- Keep total DEM payload under ~12 MB; lazy-load regional files on demand.
- Browser decodes with `DecompressionStream('gzip')`. `getElevation(lat, lonE)` does bilinear interpolation.
- Honest caveat shown in UI: MOLA at 463 m cannot resolve rover-scale hazards (rocks, small scarps, dunes).

### 8.5 Terrain quality score (deterministic, in `src/core/terrain.ts`)
```
slopeTerm   = clamp(slopeDeg / slopeLimitDeg, 0, 1)          // limit per vehicle, default rover 20°, EVA 15° (configurable assumptions)
roughTerm   = clamp(roughnessM / 500, 0, 1)
hazardTerm  = max severity of mapped hazards within 25 km (0–1)
uncertainty = 0.15 if coarse data only, else 0.05
penalty     = 0.45*slopeTerm + 0.25*roughTerm + 0.20*hazardTerm + 0.10*uncertainty
quality     = round(100 * (1 - penalty))
class: ≥80 Favourable · 60–79 Moderate · 40–59 Difficult · <40 Hazardous · no elevation data → UNKNOWN
```
Show the four terms as bars so users see **why** the score is what it is. Weights are assumptions stored in `config/assumptions.ts` and shown in Settings. Hard rule: slope ≥ vehicle limit = non-traversable. RSL-bearing slopes (>27°) are always non-traversable.

### 8.6 Temperature estimate (MODELED — never labelled measured)
Goal: a defensible range, with uncertainty.
```
Anchor (NASA MEDA, Jezero 18.4°N): surface −83 °C (pre-dawn) … +5 °C (noon); air −83 … −23 °C.
estimate(lat, ls, elevationM):
  diurnalSwing  = 88 K                                  // from the anchor range above; NOT valid at polar night/cap
  meanSurface   = anchorMean(-39 °C) - 0.4*(|lat|-18) - seasonTerm(lat, ls) - 0.0015*(elevationM)  // coefficients PLACEHOLDER-TUNE
  min = meanSurface - diurnalSwing/2 ; max = meanSurface + diurnalSwing/2
  uncertainty = ±15 K ; confidence = 'low'
```
- The coefficients are **placeholders** to be tuned; document each as `PLACEHOLDER-TUNE` in code and show "MODELED ESTIMATE · ±15 K · low confidence" in the UI.
- If a lander/rover checkpoint with logged temperature is within 500 km, show it as a separate **MEASURED anchor** (only if value is in the catalog with a citation).
- Upgrade path (document, don't implement now): Mars Climate Database queries or ingested MEDA/REMS summaries via the scheduled ETL (PDS Atmospheres).
- Polar/seasonal CO₂ frost: show the note "surface CO₂ frost possible poleward of ~60° in winter (verify)".

### 8.7 Routes in the report
For the 3 nearest checkpoints, compute A* routes (§9.4) from the chosen point and display: distance, time at the chosen vehicle speed, max slope, % route with high-res data, pass/fail against slope limit, and "Add to mission".

### 8.8 Report output shape (shared by UI and MCP)
```ts
interface LocationReport {
  query: string; lat: number; lonE: number; lonDisplay: number;
  nearestFeature: { id: string; name: string; distanceKm: number } | null;
  elevationM: { value: number | null; provenance: Provenance; resolution: 'global_8ppd' | 'regional_128ppd' | 'none' };
  slopeDeg: number | null; roughnessM: number | null;
  terrain: { quality: number | null; class: string; terms: Record<string, number>; assumptions: string[] };
  temperature: { minC: number; maxC: number; meanC: number; uncertaintyK: number; provenance: 'MODELED'; anchors: any[] };
  resources: { radiusKm: number; items: ResourceHit[]; zones: string[] };
  hazards: HazardHit[];
  routes: RouteSummary[];
  sky: SkySnapshot;                       // §11
  imagery: { layerIds: string[]; nasaImages: ImageHit[] };   // §10
  dataConfidence: 'high' | 'medium' | 'low' | 'unknown';
  generatedAt: string;
}
```

---

## 9. Mission Builder (user-made missions)

### 9.1 Flow (wizard on one page, state in URL hash so it is shareable on GitHub Pages)
1. **Pick location(s):** click map / search / "Add checkpoint". Multiple allowed; drag to reorder.
2. **Pick objectives per location** (cards with icons; user ticks any combination):
   - Collect water-ice sample · Survey clay/sulfate minerals · Collect regolith for ISRU · Geology traverse · Deploy sensor/weather station · Install habitat/power · Sky observation · Photography/imaging · Resupply cache.
   Each objective has `durationHours`, `payloadKg`, `powerWh`, `requiredEquipment[]`, `allowedVehicles[]`, `daylightRequired`, `resourceTypeRequired?`. If a location lacks the resource type an objective needs (e.g. ice at a basalt plain), show a warning with the nearest valid checkpoints.
3. **Vehicle & crew:** EVA on foot / unpressurised rover / pressurised rover; crew size; mission duration (sols); reserve %.
4. **Equipment:** auto-suggested from objectives, editable (reuse the equipment inventory from the earlier plan).
5. **Route legs:** A* between consecutive stops; user can drag waypoints; compare 2 alternatives (shortest vs lowest-risk).
6. **Evaluate:** feasibility + schedule + resource budget.
7. **Summary:** printable page + export (JSON, Markdown, print-to-PDF) + share link.

### 9.2 Mission data model
```ts
interface MissionPlan {
  id: string; name: string; createdAt: string; schemaVersion: 1;
  start: { lat: number; lonE: number; label: string };
  stops: { checkpointId?: string; lat: number; lonE: number; label: string; objectives: string[] }[];
  vehicle: 'eva' | 'rover_unpressurised' | 'rover_pressurised';
  crew: number; durationSols: number; reservePct: number; equipment: { id: string; qty: number }[];
  legs: RouteSummary[]; schedule: ScheduleItem[]; budget: ResourceBudget; feasibility: Feasibility;
  assumptions: Record<string, number | string>;
}
```
### 9.3 Evaluation rules
Reuse the earlier explicit-formula approach: `required = perPersonRate × crew × days + allocations + reserve`. Every constant is in `config/assumptions.ts` with `label`, `unit`, `source: 'SIMULATED ASSUMPTION'`. Output four separate verdicts: **Resource**, **Terrain**, **Schedule/daylight**, **Data coverage**, plus **Overall** (`FEASIBLE UNDER ASSUMPTIONS` · `FEASIBLE WITH WARNINGS` · `INFEASIBLE` · `INSUFFICIENT DATA`). The overall verdict is never better than the worst component. Include a "Why" list and "Fix it" suggestions (shorten, swap vehicle, change order, pick closer ice site).

Schedule uses the Mars-sky module: EVA objectives flagged `daylightRequired` must fit inside local daylight (sun elevation > 0°) at that stop's time; the schedule shows sol/LTST for each leg. Temperature at the planned local time (from §8.6) is compared to the equipment operating limits (assumption table).

### 9.4 Routing (`src/core/route.ts`, runs in a Web Worker)
- Grid from the DEM (global 8 ppd for long routes, regional 128 ppd windows near checkpoints, blended by a coarse→fine graph; keep it simple: route on a ~0.25° grid unless both ends are in one regional window).
- 8-connected A*, edge cost from the earlier plan: `C = wd·distance + ws·slopePenalty + wh·hazard + wu·uncertainty`; non-traversable if slope ≥ limit, in a hazard polygon, or **no data** (unknown ≠ safe; the router treats it as impassable by default, with a "risk-tolerant" toggle that allows it at a high cost and flags the leg `LOW CONFIDENCE`).
- Heuristic: haversine ÷ minimum edge cost scale (admissible).
- Return: geometry (lat/lonE list), distance, time, climb, max slope, % high-res coverage, a polyline with segment flags (OK / steep / no-data), or `{ error: 'NO_ROUTE', reason }`.
- Historical rover tracks are shown for context and are **not** automatically valid routes for other vehicles.
- Tests: synthetic ramp slope (e.g., 20 m rise / 100 m = 11.31°, as in the existing tests), blocked corridor → NO_ROUTE, unknown-data cell not crossed by default.

---

## 10. Satellite views

**Goal:** dynamic orbital imagery for any point, from NASA sources.

`SatellitePanel` (opens from any checkpoint or the report):
1. **Layer switcher** from `layers.json`: Viking color, MOLA shaded relief/elevation, MOC atlas, HRSC/HiRISE mosaics *where coverage exists* (check the layer `bbox`; if the point is outside, grey the option with "No coverage here" — Trek says missing tiles mean missing coverage).
2. **Zoom-to-site mini map** (second Leaflet instance, same CRS) centred on the point at the layer's max native zoom, with scale bar and a 10/50/100 km ring.
3. **Compare slider** between two layers (e.g., elevation vs imagery) using a simple clip-path slider.
4. **NASA imagery search:** call `https://images-api.nasa.gov/search?q={name}%20Mars&media_type=image` (no key) through safe-fetch; show 6 thumbnails with title, date, `NASA/JPL-Caltech/…` credit, link to the item. Filter out results that are clearly not Mars.
5. **Rover raw/Rover photos (optional):** if the checkpoint has a rover, try the Mars Rover Photos API via `api.nasa.gov` (needs `VITE_NASA_API_KEY`); fall back to the Image Library. If the endpoint is unavailable, show "Rover photo service unavailable" — do not hide the rest.
6. **Deep link:** "Open in Mars Trek", "Open HiRISE site (hirise.lpl.arizona.edu)", "Open in Eyes on the Solar System".
7. Always show: layer name, resolution, source, `retrieved` date, origin badge.

Credits are mandatory (NASA/JPL-Caltech/USGS/UA as given by each source).

---

## 11. Mars Sky

**Goal:** a dynamic sky for any location and time (default: now), computed deterministically and cited. Lives in `src/core/sky/` with unit tests; UI in `SkyPage` and as a card inside the Location Report.

### 11.1 Time and season (Mars24 / Allison & McEwen 2000)
Use the standard Mars24 chain. **Agent must verify constants against the published Mars24 tables before shipping** and add tests.
```
JD_UT   = Unix_ms/86400000 + 2440587.5
JD_TT   = JD_UT + 69.184/86400
ΔtJ2000 = JD_TT − 2451545.0
M       = 19.3871 + 0.52402073·ΔtJ2000            (deg)
αFMS    = 270.3863 + 0.52403840·ΔtJ2000
EOC     = (10.691 + 3.0e-7·ΔtJ2000)·sin M + 0.623·sin 2M + 0.050·sin 3M + 0.005·sin 4M + 0.0005·sin 5M + PBS
Ls      = αFMS + EOC
MSD     = (JD_TT − 2405522.0028779) / 1.0274912517
MTC     = 24·frac(MSD)                          (hours, at Airy-0)
LMST    = MTC − lonWest/15 ; lonWest = 360 − lonE
EOT     = (2.861·sin 2Ls − 0.071·sin 4Ls + 0.002·sin 6Ls − EOC)/15   (hours)
LTST    = LMST + EOT
δ_sun   = asin(0.42565·sin Ls) + 0.25°·sin Ls
hourAng = 15°·(LTST − 12)
sin(elev) = sin φ sin δ + cos φ cos δ cos(hourAng)
```
Outputs: Mars Year, Ls, season name, sol number, LTST, sun elevation/azimuth, sunrise/sunset/daylight length (solve numerically), local twilight.
**Sanity tests:** Mars Year 34 began ≈ 5 May 2017 and MY 35 ≈ 26 Mar 2019 (±1 day, verify against a published calendar). On 17 Oct 2026 the app should report early Mars Year 39 with Ls in the low tens of degrees — treat a very different answer as a bug.

### 11.2 What the sky view draws (Canvas 2D, no heavy libs)
- **Sky colour model:** butterscotch/dusty-tan by day; the sky near the Sun at sunrise/sunset glows **blue** (a real Mars phenomenon seen by rovers); dark with stars at night. Dust opacity (`tau`) is a slider (default 0.5) clearly labelled `SIMULATED`.
- **Sun:** angular diameter ≈ 21′ (≈ 0.35°), scaled by Mars–Sun distance from the orbit (Ls-based).
- **Stars:** bundle ≈ 500 brightest stars (BSD-licensed `d3-celestial`/Yale BSC subset in `public/data/stars.json`). Rotate into Mars's frame using the IAU pole (RA ≈ 317.68°, Dec ≈ 52.89°; prime meridian W ≈ 176.63° + 350.89198226°/day — verify against the IAU WGCCRE report).
- **Planets (Earth, Venus, Mercury, Jupiter, Saturn):** `astronomy-engine` (MIT) heliocentric vectors → Mars-centred → equatorial → Mars horizon coordinates. Highlight **Earth** as an "evening/morning star" with its elongation from the Sun.
- **Phobos & Deimos:** simplified circular equatorial orbits (Phobos ≈ 7.65 h period, ≈ 9,376 km radius; Deimos ≈ 30.3 h, ≈ 23,463 km) → apparent size/position. Label as `APPROXIMATE`. Phobos rises in the west and sets in the east; show that as a check.
- **Time controls:** now · ± sols · scrub 24 h of LTST · "next sunrise" · play/pause (respect reduced-motion).
- **Overlay card:** `Sol / LTST / Ls / Season / Sun elev / Daylight / Earth elongation / Phobos & Deimos up?`.

### 11.3 NASA-sourced dynamic parts
- Embed **NASA Eyes on the Solar System** (Mars) as the "Orbit & context" tab (iframe; offline fallback = static image + link).
- "Mars sky news": the latest relevant items from your resource list + APOD (live via safe-fetch, with fixture).
- Optional (documented upgrade): precomputed SPICE tables via `spiceypy` in `scripts/` for validation of the JS sky maths — the Space Apps guide's rule is "geometry is computed, never guessed".

---

## 12. UI structure

Keep the earlier application shell (top bar + sidebar) with these routes (use **HashRouter** so deep links work on GitHub Pages):

| Route | Page | Core content |
|---|---|---|
| `#/` | Mission Overview | Hero, resource summary, "today on Mars" card (sol, Ls, sun, season), recommended next actions |
| `#/map` | **Mars Map** (rebuilt) | Static bounded map, layers, search, checkpoint filters, Location Report drawer |
| `#/location/:lat/:lon` | Location Report page | Full report; shareable |
| `#/satellite` | Satellite | §10, can open prefilled |
| `#/sky` | Mars Sky | §11 |
| `#/planner` | **Mission Builder** | §9 wizard + summary |
| `#/survival` | Survival Center | Simulation dashboard as in the earlier plan, now fed by the active mission |
| `#/manual` | Field Manual | Searchable articles, each linking to map locations |
| `#/about` | Data & Credits | Sources, link audit, licenses, provenance legend |

Map page layout: left collapsible **Checkpoints/Layers** panel · centre map · right **Location Report** drawer (bottom sheet on mobile) · bottom **route bar** (distance · time · risk · data coverage).
Everything keyboard-reachable; status never colour-only; `prefers-reduced-motion` respected; touch targets ≥ 44 px; no horizontal overflow at 360 px.

---

## 13. Repository changes and GitHub Pages deployment

### 13.1 Target structure
```
mars-lantern/
├─ MARS_LANTERN_SPEC.md      ← this file
├─ AGENTS.md  CLAUDE.md      ← agent rules (§17)
├─ README.md                 ← rewrite (what/how/data/limits)
├─ LICENSE                   ← Apache-2.0 (Space Apps rule: open source)
├─ .github/workflows/{deploy.yml, refresh-data.yml}
├─ public/
│  ├─ brand/  tiles/fallback-global.jpg  fonts/  manifest.webmanifest
│  └─ data/{checkpoints.json, layers.json, sources.json, stars.json, equipment.json, articles.json, dem/…, tracks/…}
├─ scripts/{build-layer-registry.ts, build-dem.py, build-tracks.ts, audit-links.ts}
├─ src/
│  ├─ core/        # pure TS, NO React, NO DOM → shared with MCP server
│  │   {geo, search, terrain, temperature, route, mission, safeFetch, types}.ts  sky/…
│  ├─ app/ components/ pages/ state/ workers/
├─ mcp/            # MCP server (§14) imports ../src/core
└─ docs/{MAP_LOOP_ROOT_CAUSE.md, LINK_AUDIT.md, AI_USE.md, DATA_PROVENANCE.md}
```
**Rule:** `src/core` has no browser APIs except where isolated (`safeFetch` takes injectable fetch/storage). This lets the web app and the MCP server share the same tested science code — the same boundary the Space Apps guide recommends ("deterministic code does the science").

### 13.2 Vite config (fix the base path)
Your current config hard-codes `base: '/Project_Mongol_Pathik_2/'`. Replace with an env-driven value so renames cannot break the live site:
```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/',
  server: { port: 3000, host: true },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 900 },
});
```
- Router: `HashRouter`. Asset URLs: `import.meta.env.BASE_URL + 'data/…'` (never a leading `/`).
- Rename the GitHub repo to e.g. `mars-lantern`; live URL becomes `https://<user>.github.io/mars-lantern/`. (Your existing repo is `Dipto2103/Project_Mongol_Pathik_2`; either keep it and set `VITE_BASE=/Project_Mongol_Pathik_2/`, or rename and update.)
- Remove the CDN Leaflet CSS link from `index.html` and `import 'leaflet/dist/leaflet.css'` instead, so it is bundled.

### 13.3 Deploy workflow — `.github/workflows/deploy.yml`
```yaml
name: Deploy MARS LANTERN
on: { push: { branches: [main] }, workflow_dispatch: {} }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          VITE_BASE: /${{ github.event.repository.name }}/
          VITE_NASA_API_KEY: ${{ secrets.NASA_API_KEY }}
      - run: cp dist/index.html dist/404.html        # SPA fallback
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: '${{ steps.d.outputs.page_url }}' }
    steps:
      - id: d
        uses: actions/deploy-pages@v4
```
Repo settings → Pages → Source: **GitHub Actions**. Note: any `VITE_*` key is visible in the browser bundle; use a normal free NASA key (not a private one) and rely on caching.

### 13.4 Bundle/performance rules
- Lazy-load pages, sky module, and DEM windows; target initial JS < 400 KB gzip, DEM global < 5 MB gz.
- Service worker (`vite-plugin-pwa`, optional) precaching `data/`, fonts, fallback tile; never cache NASA tiles aggressively beyond the browser default.

---

## 14. MCP server access

GitHub Pages is static, so it **cannot run an MCP server**. Provide two things:

**14.1 Static agent-readable data (works on Pages):** publish `public/data/*.json`, `public/llms.txt` (what the site is, endpoints, provenance legend) and `public/data/manifest.json` (file list, schema versions, build date). Any agent can read these over HTTPS.

**14.2 MCP server (local stdio, optional remote):** `mcp/server.ts` using `@modelcontextprotocol/sdk` + `zod`, importing the shared core. Tools:
| Tool | Input | Returns |
|---|---|---|
| `list_checkpoints` | `{ resourceType?, kind?, bbox? }` | checkpoint summaries |
| `get_location_report` | `{ query }` (name or coordinates) | `LocationReport` JSON |
| `find_resources_near` | `{ lat, lonE, radiusKm, resourceType? }` | hits + distances |
| `plan_route` | `{ from, to, vehicle, riskTolerance }` | route summary or `NO_ROUTE` |
| `evaluate_mission` | `{ plan: MissionPlan }` | feasibility + budget + assumptions |
| `get_mars_sky` | `{ lat, lonE, utc? }` | sky snapshot |
| `search_nasa_images` | `{ query }` | image hits with credits |
```ts
// mcp/server.ts (skeleton)
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getLocationReport } from '../src/core/report';
const server = new McpServer({ name: 'mars-lantern', version: '1.0.0' });
server.tool('get_location_report',
  'Terrain quality, temperature estimate, nearby resources and routes for a Mars place. Returns provenance for every value (MEASURED/NASA-DERIVED/MODELED/UNKNOWN).',
  { query: z.string().describe('Place name or "lat, lon" (east-positive longitude, 0–360 or −180..180)') },
  async ({ query }) => ({ content: [{ type: 'text', text: JSON.stringify(await getLocationReport(query), null, 2) }] }));
// …register the other tools the same way…
await server.connect(new StdioServerTransport());
```
- Data in the server comes from `public/data` on disk, or from the live Pages URL if `MARS_LANTERN_DATA_URL` is set.
- Antigravity config (menu names may differ by version — check **Agent → MCP Servers → raw config**): 
```json
{ "mcpServers": { "mars-lantern": {
  "command": "npx", "args": ["tsx", "/ABSOLUTE/PATH/mars-lantern/mcp/server.ts"],
  "env": { "NASA_API_KEY": "your_key", "MARS_LANTERN_DATA_URL": "https://<user>.github.io/mars-lantern/data/" } } } }
```
- Test: `npx @modelcontextprotocol/inspector npx tsx mcp/server.ts` — confirm the tools list before writing agent code. Use **absolute paths** and **restart the client** after editing the config (the two classic failures from the Space Apps guide).
- Your existing Python `nasa_tools_mcp.py` (FIRMS/POWER/CMR) can stay as a second server; just don't duplicate tool names.

---

## 15. Testing and acceptance

**Unit (Vitest, must pass in CI):** coordinate parser; lon wrap; haversine (known distance); DEM bilinear sampling; slope on ramp (11.31°); terrain score; temperature anchor reproduction (Jezero min/max within the cited range at the anchor lat); A* open field, blocked corridor, unknown-data avoidance; mission evaluator (pass, resource fail, terrain fail, insufficient data); sky: Ls/MY sanity dates, sun elevation at noon on the equator, Phobos direction; MissionPlan Zod round-trip.
**Integration:** search "jezero" → report renders; click map → report; add two stops + objectives → route → evaluate → export JSON → reload from URL hash.
**Visual/manual:** pan to every edge — no repeat, no loop; zoom limits; calibration markers (§3.4); mobile 360 px; keyboard-only run; reduced motion; offline (`?offline=1`) demo.
**Release gate:** `npm run build` succeeds; Pages URL opens in a private window; no console errors; `docs/LINK_AUDIT.md` shows all `critical` sources OK; every number has a provenance badge.

---

## 16. Space Apps judging alignment (so the live app scores)

- **Challenge named** on the project page: *Interplanetary Survival Guide: Martian Map*. **Public repo** with LICENSE. **Project page submitted.** (These are the three cheap single points in the guide.)
- **Validity:** show the `src/core` boundary, tests, provenance badges, honest limits (463 m DEM; modeled temperature). Add a "Methods & limits" panel.
- **Relevance:** NASA data central — name Mars Trek/Viking/MOLA/PDS/MEDA/SWIM on camera and on the About page.
- **Creativity:** the Mission Builder + Mars Sky; killer demo = *type "Arcadia Planitia" → report → add ice objective → route → sky shows daylight window → feasibility verdict → share link.*
- **Disclosure:** keep `docs/AI_USE.md` current (tools used, prompts, what you did yourself). Videos: no recognisable name/voice/likeness of anyone under 18.
- Verify dates and rules at spaceappschallenge.org before submitting.

---

## 17. Agent rules (copy into `AGENTS.md` / `CLAUDE.md`)
1. Inspect the repo first; **migrate existing data, don't retype it**. Don't create a second framework.
2. Science lives in `src/core` (pure, tested). UI never computes science inline.
3. Never fabricate NASA data. Unknown stays `UNKNOWN`; unknown terrain is never "safe".
4. Every displayed number has a provenance badge and a source link.
5. Don't hard-code tile URLs — read them from `GetCapabilities` via the registry script.
6. Keys in `.env`, commit `.env.example` only. `VITE_*` values are public.
7. Don't claim a feature works until tested; report real command output.
8. Strip tracking params (`utm_source`) from URLs.
9. Keep `docs/AI_USE.md` updated with every significant AI-generated change.

---

## 18. Master Prompt for Antigravity (paste this)

```
PROJECT: MARS LANTERN (rename of ARES / Interplanetary Survival Guide: Martian Map)
Read MARS_LANTERN_SPEC.md fully, then the project files, before editing anything.

Act as a senior frontend engineer + geospatial developer + simulation engineer.
Work in the EXISTING repo (React 18, TypeScript strict, Vite, Tailwind, Leaflet, Recharts).
Do not replace the app or add a second map framework.

ORDER OF WORK (commit after each phase; run tests/build between phases):
P0  Inspect repo; write docs/MAP_LOOP_ROOT_CAUSE.md (spec §3.3). Report findings before fixing.
P1  Branding + base path + HashRouter + deploy workflow (spec §2, §13). Build must pass.
P2  src/core: geo, types (Zod), safeFetch, search parser + tests (spec §4, §7.4, §8.2).
P3  Rebuild the map as a bounded equirectangular engine, no wrap, no render loop;
    layer registry script + layers.json + fallback basemap; calibration markers pass (spec §3–§5).
P4  Checkpoint catalog: migrate existing data first, then add spec §6.2 entries with
    provenance badges, clustering and filters.
P5  DEM ETL (scripts/build-dem.py) + terrain score + temperature estimate + resources-near +
    getLocationReport + Location Report UI (spec §8).
P6  Routing worker (A*) with unknown-is-impassable default + route UI (spec §9.4).
P7  Mission Builder wizard, objectives, evaluation, export, URL-hash share (spec §9).
P8  Satellite panel (spec §10). Mars Sky module + page + report card with Mars24 maths and tests (spec §11).
P9  Survival Center wired to the active mission; Field Manual articles linked to map locations.
P10 MCP server + llms.txt + manifest (spec §14). Link audit script + docs/LINK_AUDIT.md.
P11 Accessibility, responsive (360 px), offline (?offline=1), performance budget, final QA (spec §15).

HARD RULES: never fabricate NASA data; mark every value MEASURED/NASA-DERIVED/MODELED/SIMULATED/UNKNOWN;
RSL are not a water resource; temperature is a labelled estimate; verify every
"memory-verify" coordinate against its NASA page and update coordSource.

FINISH: summarise changes, list files, state which features use real vs modeled vs sample data,
paste actual test/build output, give the start command (npm run dev) and the live Pages URL steps.
```

---

## 19. Known limitations to state openly in the app
- MOLA 463 m terrain cannot resolve rover-scale hazards; slope/roughness are regional indicators.
- Temperature is a modeled estimate (low confidence) unless a cited lander anchor is within range.
- SWIM zones indicate *likelihood* of shallow ice, not confirmed deposits (except directly measured sites such as the Phoenix landing site).
- Phobos/Deimos positions are approximate; planet positions come from an ephemeris library and are not mission-grade.
- Survival numbers are simulation assumptions, not validated astronaut requirements.
- Trek tile availability depends on NASA servers; the fallback basemap is lower resolution.

*End of specification.*
