# MARS LANTERN — UI Gaps & Scientific Provenance Audit

This document tracks UI data bindings, provenance assignments, and data availability across all views in accordance with `MARS_LANTERN_SPEC.md` §17 and `MARS_LANTERN_UI_SPEC.md` §0.3.

---

## 1. Provenance Classifications
Every numeric value and telemetry readout rendered in the MARS LANTERN UI must display one of five provenance badges:
- **`MEASURED`**: Direct in-situ sensor telemetry from landed spacecraft (e.g. Curiosity REMS, Perseverance MEDA, Phoenix trench, InSight SEIS).
- **`NASA-DERIVED`**: Extracted directly from published NASA/USGS/ESA mission products (MOLA DEM, Viking MDIM 2.1, HiRISE DTMs, CRISM spectral cubes, SWIM ice maps).
- **`MODELED`**: Deterministic engineering model (e.g. MOLA/MEDA-anchored surface temperature with $\pm 15\,\text{K}$ uncertainty band; Mars24 Allison & McEwen ephemeris).
- **`SIMULATED`**: Life support consumption, ECLSS rates, EVAs, battery margins, and mission planning assumptions from `src/config/assumptions.ts`.
- **`UNKNOWN`**: Data is unavailable, coverage is missing, or unverified. Rendered in grey with `?` — **never marked as "safe"**.

---

## 2. Page-by-Page Audit & Gaps

### 2.1 Landing Page (`#/`)
| UI Element | Spec Mockup Value | Actual Data Source | Provenance | Status |
|---|---|---|---|---|
| Average Temp | −63 °C | `estimateSurfaceTemperature(18.44, -2500, 0)` from `src/core/temperature.ts` | `MODELED` | Available |
| Dust Storms | "Low Risk" | Derived from Mars seasonal $L_s$ dust activity model in `mars24.ts` / `temperature.ts` | `MODELED` | Available |
| Atmosphere | 0.6 kPa | MOLA standard reference atmospheric pressure at datum ($\sim 610\,\text{Pa}$) | `NASA-DERIVED` | Available |
| Sol & LTST | SOL 12, 14:32 | Allison & McEwen (2000) Mars24 ephemeris from `src/core/sky/mars24.ts` | `NASA-DERIVED` | Available |

### 2.2 Mars Layers (`#/map`)
| UI Element | Spec Mockup Value | Actual Data Source | Provenance | Status |
|---|---|---|---|---|
| Terrain / Elevation / Hazard Basemaps | Viking, MOLA, Hazards | `public/data/layers.json` + `public/tiles/fallback-global.jpg` | `NASA-DERIVED` | Available |
| Selected Location Elevation | 21,900 m | MOLA DEM query via `src/core/dem.ts` | `NASA-DERIVED` | Available |
| Terrain Difficulty | "Low" / Score | `calculateTraversabilityCost` from `src/core/terrain.ts` | `MODELED` | Available |
| Rover Tracks | Curiosity / Percy | `src/data/roverTraverses.ts` | `NASA-DERIVED` | Available |

### 2.3 Survival Dashboard (`#/survival`)
| UI Element | Spec Mockup Value | Actual Data Source | Provenance | Status |
|---|---|---|---|---|
| Oxygen Gauge | 78 %, 4.2 days left | Simulated ECLSS consumption rate in `src/config/assumptions.ts` | `SIMULATED` | Available |
| Water Gauge | 62 %, 3.1 days left | Simulated ECLSS consumption & recycling rate in `assumptions.ts` | `SIMULATED` | Available |
| Food Gauge | 85 %, 5.7 days left | Metabolic caloric consumption model in `assumptions.ts` | `SIMULATED` | Available |
| Habitat Pressure | 101.3 kPa (Normal) | Standard sea-level/ISS equivalent habitat atmosphere design target | `SIMULATED` | Available |
| Surface Temperature | −18 °C | Modeled ground temperature for active site/time from `src/core/temperature.ts` | `MODELED` | Available |
| Radiation Telemetry | 0.24 mSv/day | Surface GCR dose rate benchmark (Curiosity RAD in-situ measurement, Hassler et al. 2014) | `MEASURED` | Available |

### 2.4 Field Manual (`#/manual`)
| UI Element | Actual Data Source | Provenance | Status |
|---|---|---|---|
| Survival & Geology Articles | `public/data/articles.json` | `NASA-DERIVED` / `MEASURED` | 5 core articles available |
| Equipment Specifications | Suit, PLSS, Rover specs in `src/config/assumptions.ts` | `SIMULATED` | Available |
| Linked Checkpoints | `public/data/checkpoints.json` | `NASA-DERIVED` | Available |

### 2.5 Mission Planner (`#/planner`, `/planner/route`, `/planner/compare`, `/planner/briefing`)
| UI Element | Actual Data Source | Provenance | Status |
|---|---|---|---|
| Route Distance & Sols | `src/core/route.ts` (A* with MOLA gradient cost) | `MODELED` | Available |
| Consumables (O₂, H₂O, Food) | `src/core/mission/evaluation.ts` (BVAD rates) | `SIMULATED` | Available |
| Daylight & Solar Window | `src/core/sky/mars24.ts` | `NASA-DERIVED` | Available |
| Data Coverage Score | `src/core/mission/evaluation.ts` | `NASA-DERIVED` | Available |

### 2.6 Scientific Guardrails Applied
1. **Recurring Slope Lineae (RSL):** Explicitly marked as slope hazards ($> 27^\circ$, dry granular flow per USGS/HiRISE) and contested science sites. Never marked as water resources.
2. **Subsurface Ice:** SWIM data labelled as *likelihood*, not direct proof (except Phoenix trench and Korolev water ice).
3. **MOLA Temperatures:** Always labeled with $\pm 15\,\text{K}$ uncertainty band and `MODELED` badge unless anchored directly to the Perseverance MEDA or Curiosity REMS stations.
