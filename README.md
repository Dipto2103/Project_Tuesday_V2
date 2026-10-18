# MARS LANTERN — Martian Survival Atlas & Exploration System

> *"Carry the light. Read the planet."*

**Challenge:** NASA Space Apps Challenge 2026 — *Interplanetary Survival Guide: Martian Map* (Challenge 11)  
**Live Application:** Static GitHub Pages Deployment (`HashRouter`) + Local Model Context Protocol (MCP) Server  
**Framework:** React 18, TypeScript (Strict Mode), Vite, Tailwind CSS, Leaflet 1.9, Recharts  

---

## 1. Overview

**MARS LANTERN** is a deterministic, NASA-data-grounded planetary cartography workstation and exploration atlas. Built for future human astronauts, planetary scientists, and mission planners, it transforms raw orbital remote sensing, rover telemetry, and digital elevation models into actionable survival intelligence.

### Key Capabilities

1. **Equirectangular Bounded Map Engine (`EPSG:4326`):**
   - Strictly bounded `[[-90, -180], [90, 180]]` with `maxBoundsViscosity: 1.0` and `noWrap: true`. Eliminates infinite world-wrapping and render-loop CPU thrashing.
   - Live NASA Mars Trek WMTS tile mosaics (Viking Color 232 m, MOLA Shaded Relief 463 m, MOC Atlas, HRSC/HiRISE).
   - High-resolution offline fallback basemap (`public/tiles/fallback-global.jpg`) with automatic failover after 5 tile errors.

2. **Verified Checkpoint & Resource Catalog:**
   - 42 verified checkpoints spanning landing sites, scientific targets, and resource zones.
   - Resource categorization: shallow water-ice (SWIM project radar/neutron likelihood), clay phyllosilicates (CRISM), basaltic regolith, sulfates, iron oxides, and atmospheric $\text{CO}_2$ (feedstock for MOXIE oxygen generation).
   - Strict NASA scientific guardrail: **Recurring Slope Lineae (RSL) are dry granular flows on slopes $>27^\circ$, NOT water resources.** Classified strictly as hazards.

3. **Deterministic Topography, Terrain Scoring & Temperature:**
   - Global MGS MOLA MEGDR elevation grid at 8 px/deg (2880×1440, int16 meters, 1.54 MB gzip) plus 128 px/deg regional DEM windows for 20 priority sites.
   - Deterministic 4-term terrain quality score:
     $$\text{Penalty} = 0.45 \cdot \text{slopeTerm} + 0.25 \cdot \text{roughTerm} + 0.20 \cdot \text{hazardTerm} + 0.10 \cdot \text{uncertainty}$$
   - Modeled surface temperature anchored to Perseverance MEDA ground truth (-83 °C pre-dawn to +5 °C noon, 88 K diurnal swing) with labeled $\pm 15\,\text{K}$ uncertainty.

4. **Planetary Routing Engine (A\* & Web Worker):**
   - 8-connected grid search across MOLA elevation data running in a background Web Worker.
   - Enforces vehicle slope limits (EVA 15°, unpressurized rover 20°, pressurized rover 25°).
   - Dual route generation: Primary (shortest feasible terrain-aware path) vs Alternative (lowest-hazard conservative path).
   - Scientific policy: Unmeasured terrain is treated as impassable by default.

5. **Mission Builder & Evaluation Engine:**
   - Multi-stop expedition wizard with 9 selectable scientific objectives.
   - Consumables budget formulas: $\text{O}_2$, $\text{H}_2\text{O}$ (85% ECLSS recovery), food, and battery power.
   - 4 separate verdicts: Resource, Terrain, Schedule/Daylight, and Data Coverage. Overall verdict equals $\min(\dots)$.
   - Zero-backend URL-hash state sharing (`#mission=...`) and Markdown/JSON export.

6. **Satellite Views & Mars Sky Module:**
   - Orbital remote sensing panel with high-resolution target minimap, 10/50/100 km range rings, and dynamic NASA Image Library search.
   - Allison & McEwen (2000) Mars24 ephemeris engine calculating $L_s$ (solar longitude), sol, LTST, sun elevation, daylight hours, Phobos/Deimos visibility, and Earth elongation.
   - 2D Canvas sky dome with atmospheric dust optical depth ($\tau$) and realistic blue sunrise/sunset scattering halo.
   - Embedded NASA Eyes on the Solar System 3D view.

7. **Survival Center & Field Manual:**
   - Real-time simulation of active mission consumables countdown and point-of-no-return return-to-base abort envelope.
   - Contingency injection: ECLSS membrane failure, global dust storms, and drivetrain degradation.
   - Searchable field manual linking operational directives to interactive map coordinates.

8. **Local Model Context Protocol (MCP) Server:**
   - Exposes 7 core tools sharing pure TypeScript logic in `src/core/` via standard stdio transport for AI agents.

---

## 2. Scientific Data Provenance & Badging

Every number, metric, and layer carries an explicit provenance badge:
- `MEASURED`: In-situ ground truth (Phoenix water ice, Perseverance MEDA weather, MOXIE O₂ extraction, Curiosity ChemCam).
- `NASA-DERIVED`: Direct orbital instrument product or authoritative peer-reviewed cartography (MGS MOLA DEM, CRISM mineralogy, SWIM ice likelihood, HiRISE RSL repose angles).
- `MODELED`: Deterministic mathematical engineering approximation anchored to a measured reference (Mars24 ephemeris, diurnal thermal model $\pm 15\,\text{K}$).
- `SIMULATED`: Parametric assumption based on NASA human mission architectures (EVA metabolic rates, ECLSS recycling rates).
- `UNKNOWN`: Missing or unmeasured terrain. **Never marked as safe.**

See [docs/DATA_PROVENANCE.md](docs/DATA_PROVENANCE.md) for complete details.

---

## 3. Getting Started

### Prerequisites
- Node.js LTS (v18+ or v20+)
- PowerShell (Windows) or Bash (macOS/Linux)

### Installation & Local Development
```powershell
# Prepend Node path if required:
$env:PATH = "C:\Users\User\AppData\Local\Programs\nodejs;" + $env:PATH

# Clean install dependencies
npm ci

# Launch local development server (port 3000)
npm run dev

# Run automated Vitest test suite (16 suites, 80 tests)
npm test

# Build production bundle
npm run build
```

### Offline Mode Demonstration (`?offline=1`)
To run MARS LANTERN with Wi-Fi disabled or in offline demonstration mode, open:
`http://localhost:3000/?offline=1`
All dynamic API queries gracefully fall back to local committed fixtures in `public/data/fixtures/`, the basemap switches to the pre-rendered offline global mosaic, and a prominent `⚡ OFFLINE MODE` badge appears in the top navigation bar.

### Running the Local MCP Server
```powershell
npx tsx mcp/server.ts
```
To inspect with the Model Context Protocol Inspector:
```powershell
npx @modelcontextprotocol/inspector npx tsx mcp/server.ts
```

---

## 4. Automated Testing & Verification Gates

The test suite validates the entire deterministic core:
- `tests/calibration.test.ts`: Geodetic calibration of Olympus Mons (18.65°N, 226.2°E), Jezero Crater (18.44°N, 77.45°E), and Gale Crater (4.59°S, 137.44°E).
- `tests/sky.test.ts`: Mars24 ephemeris math, MY 34/35 sanity checks, and Phobos prograde orbit verification.
- `tests/routeCore.test.ts`: A* pathfinding, slope limits, obstacle circumnavigation, and dual-route calculation.
- `tests/mission.test.ts`: Consumable budgets, objective resource matching, and URL-hash roundtrip serialization.
- `tests/mcpAndData.test.ts`: Data manifest, LLM reference, and source registry integrity.
- `tests/report.test.ts`: Location dossier generation, terrain scores, and hazard radiuses.

---

## 5. Known Limitations (Spec §19)

- **DEM Resolution Limit:** MOLA at 463 m/px cannot resolve boulder-scale obstacles, meter-scale scarps, or sand dunes. Slope/roughness reflect regional gradients.
- **Modeled Temperature:** Surface temperature is a labeled engineering estimate ($\pm 15\,\text{K}$ uncertainty) unless anchored within 500 km of a cited lander log.
- **SWIM Zones:** SWIM maps shallow ice *likelihood*, not confirmed deposits (outside direct in-situ lander sites like Phoenix).
- **Natural Satellites:** Phobos and Deimos positions are approximate equatorial orbits.
- **Life Support Numbers:** Consumable rates are simulation assumptions derived from NASA BVAD literature, not flight-certified rules.
- **Trek Tile Services:** Dependent on NASA WMTS server uptime. Fallback offline basemap activates automatically if unavailable.

---

## 6. License & AI Transparency

- **License:** Apache-2.0 (Open Source for NASA Space Apps Challenge).
- **AI Use Documentation:** Full architectural disclosures, prompts, and phase logs are maintained in [docs/AI_USE.md](docs/AI_USE.md).
