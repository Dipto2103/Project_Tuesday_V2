# Root Cause Analysis: Map Infinite Loop

**Project:** MARS LANTERN (formerly ARES / Interplanetary Survival Guide: Martian Map)  
**Investigation Date:** 2026-10-17  
**Status:** Diagnosed & Documented  
**Reference:** `MARS_LANTERN_SPEC.md` §3 (Fixing the "infinite loop" map)

---

## Executive Summary

The reported "infinite loop" symptom stems from a combination of two distinct flaws in the original codebase:
1. **Cause A (Visual Infinite Loop — Planetary World-Wrap):** Leaflet's default coordinate reference system (`L.CRS.EPSG3857`) was used with `noWrap={false}` explicitly enabled on tile layers and no `maxBounds` defined. Panning horizontally causes Mars to repeat indefinitely side-by-side, giving the appearance of an endless, looping planetary surface.
2. **Cause B (Logic & Component Thrashing Loop — Unthrottled State Updates):** The `useMapEvents` hook in `MarsMap.tsx` emits unthrottled `mousemove` events at display refresh rate (60–120 Hz). These events trigger top-level state updates in `App.tsx` (`setCursorCoord`), which in turn re-renders `App` and passes freshly constructed array references (e.g., `activeOverlays`) back down into `MarsMap.tsx`, forcing React-Leaflet to reconcile `<TileLayer>` elements continuously.

---

## 1. Cause A: Visual Infinite Loop (World-Wrap across Longitude)

### Evidence in Code

#### A1. Explicit `noWrap={false}` on Tile Layers
In `src/components/map/MarsMap.tsx`:
- **Line 164:**
  ```tsx
  {/* Base Planetary Tile Layer */}
  <TileLayer
    key={activeBaseLayer.id}
    url={activeBaseLayer.url}
    attribution={activeBaseLayer.attribution}
    maxZoom={activeBaseLayer.maxZoom}
    minZoom={activeBaseLayer.minZoom}
    opacity={activeBaseLayer.opacity}
    noWrap={false}
  />
  ```
- **Line 176:**
  ```tsx
  {/* Overlays (e.g. MOLA Shaded Relief) */}
  {activeOverlays.map((overlay) => (
    <TileLayer
      key={overlay.id}
      url={overlay.url}
      attribution={overlay.attribution}
      maxZoom={overlay.maxZoom}
      minZoom={overlay.minZoom}
      opacity={overlay.opacity}
      noWrap={false}
    />
  ))}
  ```
By explicitly setting `noWrap={false}`, Leaflet replicates tile columns infinitely along the horizontal axis ($x$).

#### A2. Missing Coordinate Reference System (CRS)
In `src/components/map/MarsMap.tsx`:
- **Lines 142–149:**
  ```tsx
  <MapContainer
    center={[18.4447, 77.4508]} // Default centered on Jezero Crater
    zoom={7}
    minZoom={1}
    maxZoom={activeBaseLayer.maxZoom}
    style={{ width: '100%', height: '100%', background: '#0b0c10' }}
    zoomControl={false}
  >
  ```
`<MapContainer>` does not declare a `crs` property. Leaflet defaults to `L.CRS.EPSG3857` (Earth Spherical Web Mercator). However, standard Mars Trek WMTS layers (such as `nasa-trek-viking` and `nasa-trek-mola-shade` configured in `src/data/marsLayers.ts`) are **equirectangular mosaics** designed for `L.CRS.EPSG4326` (2 columns $\times$ 1 row at zoom level 0).

#### A3. Missing Geographic Bounds & Viscosity
In `src/components/map/MarsMap.tsx`:
- No `maxBounds` is provided to `<MapContainer>`.
- `maxBoundsViscosity` is not configured.
- `worldCopyJump` is left as default `false`.

### Impact
When a user pans left or right past the antimeridian, Mars repeats indefinitely. Olympus Mons, Jezero, and Gale appear repeatedly across the viewport. To the user, panning feels like an endless looping conveyor belt.

---

## 2. Cause B: Logic & Re-render Thrashing Loop

### Evidence in Code

#### B1. High-Frequency Cursor State Dispatch
In `src/components/map/MarsMap.tsx`:
- **Lines 93–99 (`MapController`):**
  ```tsx
  useMapEvents({
    mousemove(e) {
      onCursorMove({
        latitude: parseFloat(e.latlng.lat.toFixed(5)),
        longitude: parseFloat(e.latlng.lng.toFixed(5))
      });
    },
    ...
  });
  ```
In `src/app/App.tsx`:
- **Line 140:**
  ```tsx
  onCursorMove={setCursorCoord}
  ```
Every mouse pixel movement across the map immediately invokes `setCursorCoord(...)` at 60–120 calls per second without debounce, requestAnimationFrame (rAF) batching, or memoization.

#### B2. Unmemoized Array Allocations in State Hook
In `src/hooks/useMarsLayers.ts`:
- **Line 33:**
  ```tsx
  const activeOverlays = layers.filter((l) => l.category !== 'base' && l.active);
  ```
Because `useMarsLayers()` is evaluated inside `App.tsx` on every re-render, `activeOverlays` receives a **brand-new array reference** on every single mousemove event.

#### B3. Continual React-Leaflet Reconciliation
In `src/components/map/MarsMap.tsx`:
- **Lines 168–178:**
  ```tsx
  {activeOverlays.map((overlay) => (
    <TileLayer
      key={overlay.id}
      ...
    />
  ))}
  ```
Because `activeOverlays` reference changes on every cursor tick, React-Leaflet reconciles `<TileLayer>` components on every frame, causing CPU spikes and DOM churn.

#### B4. FlyTo Animation Cascades
In `src/components/map/MarsMap.tsx`:
- **Lines 85–91 (`MapController`):**
  ```tsx
  useEffect(() => {
    if (centerTarget) {
      map.flyTo([centerTarget.latitude, centerTarget.longitude], Math.max(map.getZoom(), 8), {
        duration: 1.2
      });
    }
  }, [centerTarget, map]);
  ```
When `centerTarget` is set, `map.flyTo` initiates an animated trajectory. If the mouse pointer is inside the map viewport during the flight, `mousemove` continuously fires, compounding the re-render storm.

#### B5. Dead Zoom Event Handlers
In `src/app/App.tsx`:
- **Lines 89–96:**
  ```tsx
  const handleZoomIn = () => {
    window.dispatchEvent(new CustomEvent('ares-zoom-in'));
  };

  const handleZoomOut = () => {
    window.dispatchEvent(new CustomEvent('ares-zoom-out'));
  };
  ```
Custom events `'ares-zoom-in'` and `'ares-zoom-out'` have zero listeners in `MarsMap.tsx` or any other file in the repository.

---

## 3. Mandatory Remediation Plan (To be implemented in Phase P3)

In accordance with `MARS_LANTERN_SPEC.md` §3 and §5:

1. **Map Engine Boundary & CRS Configuration:**
   - Configure `<MapContainer>` with `crs={L.CRS.EPSG4326}`.
   - Enforce `noWrap: true` on every base layer and overlay layer.
   - Set `bounds={[[-90, -180], [90, 180]]}`.
   - Set `maxBounds={[[-90, -180], [90, 180]]}` with `maxBoundsViscosity={1.0}`.
   - Set `worldCopyJump={false}`.
   - Set `minZoom={1}`, `maxZoom={7}` (or layer-derived max), and `zoomSnap={0.5}`.

2. **Decouple Cursor Telemetry & Prevent Re-render Loops:**
   - Throttle or debounce `mousemove` coordinate reporting using `requestAnimationFrame` or a ref-based status bar updater, avoiding root `App` re-renders on cursor moves.
   - Memoize `activeOverlays` and all prop objects passed to `MarsMap`.
   - Implement imperative map control wrapper with a single debounced store action (`setViewport`).
   - Add a dev-only runtime guard counting `moveend` events per second; if $> 20$, trigger `console.error('MAP LOOP DETECTED')` and break.

3. **Coordinate Calibration Verification (Spec §3.4):**
   - Verify calibration checkpoints:
     - Olympus Mons summit: $18.65^\circ\text{N}, 226.2^\circ\text{E}$ (display lon: $-133.8^\circ$)
     - Jezero Crater: $18.44^\circ\text{N}, 77.45^\circ\text{E}$
     - Gale Crater (Bradbury Landing): $4.59^\circ\text{S}, 137.44^\circ\text{E}$
