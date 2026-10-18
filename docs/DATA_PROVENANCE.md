# MARS LANTERN — Scientific Data Provenance & Verification Policy

**Challenge:** NASA Space Apps Challenge 2026 — *Interplanetary Survival Guide: Martian Map* (Challenge 11)  
**Standard:** Complete honesty regarding data origins, modeling assumptions, and instrument limits (Spec §0, §17, §19).

---

## 1. Core Provenance Taxonomy

Every numerical metric, cartographic layer, and resource claim in MARS LANTERN carries one of five immutable provenance badges:

| Provenance Level | Definition | UI Treatment | Examples in App |
|---|---|---|---|
| `MEASURED` | Direct in-situ physical ground truth recorded by landed spacecraft or rovers. | Emerald green badge with pulse dot | Phoenix Green Valley ice trench, Perseverance MEDA weather logs, MOXIE O₂ electrolysis, Curiosity ChemCam assays. |
| `NASA-DERIVED` | Direct orbital remote sensing product or authoritative peer-reviewed cartography. | Cyan / sky blue badge | MGS MOLA DEM topography, CRISM hyperspectral phyllosilicates, SWIM shallow ice likelihood, HiRISE RSL angles of repose. |
| `MODELED` | Deterministic mathematical engineering model anchored to an empirical NASA reference point. | Indigo badge with explicit uncertainty ($\pm 15\,\text{K}$) | Diurnal surface temperature curve, Allison & McEwen Mars24 ephemeris, terrain traversability score. |
| `SIMULATED` | Parametric mission or life-support simulation assumption based on NASA human exploration architectures. | Amber badge | EVA metabolic oxygen demand (0.84 kg/sol), ECLSS 85% water recovery, battery reserves. |
| `UNKNOWN` | Unmeasured, obscured, or coarse data. **Never marked as safe.** | Rose / red alert badge with warning icon | Unmapped rough terrain, missing elevation tiles outside regional windows. |

---

## 2. Dataset Registry & Ingestion Traceability

| Dataset | Mission / Instrument | Processing Pipeline | Citation / Access |
|---|---|---|---|
| **Global Elevation (DEM)** | Mars Global Surveyor (MGS) MOLA | USGS Astrogeology 463 m/px mosaic $\to$ `scripts/build-dem.py` $\to$ `public/data/dem/global_8ppd.bin.gz` | NASA PDS Geosciences MEGDR |
| **Regional DEM Windows** | MGS MOLA MEGDR | 128 px/deg 2°×2° windows for 20 priority checkpoints in `public/data/dem/regions/` | USGS Astrogeology Planetary Maps |
| **Viking Color Mosaic** | Viking Orbiters 1 & 2 | USGS MDIM 2.1 colorized mosaic ingested via NASA Mars Trek WMTS | NASA Mars Trek (`trek.nasa.gov`) |
| **MOLA Shaded Relief** | MGS MOLA | NASA Ames / USGS hillshade ingested via Trek WMTS | NASA Mars Trek (`trek.nasa.gov`) |
| **Subsurface Water-Ice** | Subsurface Water Ice Mapping (SWIM) | Synthesis of SHARAD radar, neutron spectrometry, and thermal inertia | PSI / NASA SWIM Project (`swim.psi.edu`) |
| **In-Situ Temperature** | Mars 2020 Perseverance MEDA | Jezero surface temperature anchor (-83 °C pre-dawn to +5 °C noon) | NASA Mars 2020 MEDA Team |
| **Atmospheric O₂ Extraction** | Mars 2020 Perseverance MOXIE | Solid oxide electrolysis data (122g total O₂ produced across 16 runs) | NASA JPL MOXIE Instrument Page |
| **Rover Traverse Ground Truth** | MSL Curiosity & Mars 2020 Perseverance | PDS PLACES traverse logs and waypoints | PDS Geosciences Node (`pds-geosciences.wustl.edu`) |
| **Solar Ephemeris ($L_s$, LTST)** | NASA GISS Mars24 Algorithm | Allison & McEwen (2000) areocentric timing equations | NASA GISS (`giss.nasa.gov/tools/mars24/`) |
| **Planetary Imagery** | NASA Image & Video Library | Dynamic search via `images-api.nasa.gov` with safe-fetch caching | NASA Image Library API |

---

## 3. Specific Scientific Guardrails

1. **Recurring Slope Lineae (RSL) Non-Water Rule:**  
   Per NASA/USGS HiRISE analysis across 151 features (Dundas et al., Nature Geoscience), RSL terminate at slopes steeper than $27^\circ$, matching the angle of repose for dry granular material. **RSL are strictly classified as hazardous slip-face terrain, never as water resources.**
2. **SWIM Subsurface Ice Likelihood:**  
   SWIM data indicates shallow subsurface ice *likelihood* (0–5 m depth), not confirmed deposits, except where directly measured (Phoenix Green Valley, 68.2°N).
3. **MOLA DEM Topographic Resolution:**  
   The 463 m/px global DEM cannot resolve boulder-scale obstacles, meter-scale scarps, or sand dune slip-faces. Terrain quality scores reflect regional gradient and macro-roughness.
4. **Unknown Terrain Policy:**  
   Unmeasured or missing terrain is treated as impassable by default in the A* routing engine.

---

## 4. Known Limitations Stated Openly in UI (Spec §19)

- **DEM Resolution Limit:** MOLA at 463 m/px cannot resolve rover-scale hazards (rocks, small craters, dunes).
- **Modeled Temperature:** Surface temperature is a labeled engineering estimate ($\pm 15\,\text{K}$ uncertainty) unless anchored within 500 km of a cited lander log.
- **Natural Satellites:** Phobos and Deimos positions are approximate equatorial models.
- **Survival Model:** Life support numbers are simulation assumptions derived from NASA BVAD standards, not flight-certified flight rules.
- **Trek Tiles:** Dependent on NASA WMTS server availability. The app provides a pre-rendered 4096×2048 offline fallback basemap (`public/tiles/fallback-global.jpg`) that engages automatically when offline or after 5 tile errors.
