# MARS LANTERN — Scientific Data Source Link Audit

**Audit Timestamp:** 2026-10-17T14:55:32.093Z  
**Total Sources Audited:** 12  
**Critical Primary Sources:** 9  
**Critical Failures:** 0  

*Generated automatically by `scripts/audit-links.ts` in compliance with MARS_LANTERN_SPEC.md §7.3 and AGENTS.md Rule 8.*

| Source ID | Title | URL | Critical | HTTP Code | Status | Latency |
|---|---|---|---|---|---|---|
| `mars-trek-wmts` | NASA Mars Trek WMTS Planetary Cartography Service | [Link](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars) | **YES** | 200 | ✅ OK | 1707 ms |
| `nasa-open-api` | NASA Open APIs Portal | [Link](https://api.nasa.gov/) | **YES** | 200 | ✅ OK | 1079 ms |
| `swim-water-ice` | Subsurface Water Ice Mapping (SWIM) on Mars — Planetary Science Institute | [Link](https://swim.psi.edu) | **YES** | 200 | ✅ OK | 3935 ms |
| `phoenix-lander` | NASA Phoenix Mars Lander — In-Situ Water Ice Discovery | [Link](https://science.nasa.gov/mission/phoenix/) | **YES** | 200 | ✅ OK | 340 ms |
| `perseverance-meda` | NASA Mars 2020 Perseverance — MEDA Weather Station | [Link](https://mars.nasa.gov/mars2020/spacecraft/instruments/meda/) | **YES** | 200 | ✅ OK | 896 ms |
| `perseverance-moxie` | NASA Mars 2020 Perseverance — MOXIE Atmospheric O2 Extraction | [Link](https://mars.nasa.gov/mars2020/spacecraft/instruments/moxie/) | **YES** | 200 | ✅ OK | 882 ms |
| `curiosity-places` | NASA PDS Geosciences Node — MSL Curiosity PLACES Traverse Dataset | [Link](https://pds-geosciences.wustl.edu/missions/msl/) | **YES** | 200 | ✅ OK | 1160 ms |
| `rsl-hirise-study` | USGS & NASA HiRISE Study: Recurring Slope Lineae as Dry Granular Sand Flows | [Link](https://uahirise.org/releases/rsl/) | **YES** | 200 | ✅ OK | 3026 ms |
| `mars24-algorithm` | NASA GISS Mars24 Sunclock Time & Ephemeris Algorithm | [Link](https://www.giss.nasa.gov/tools/mars24/help/algorithm.html) | **YES** | 200 | ✅ OK | 1332 ms |
| `nasa-eyes-mars` | NASA Eyes on the Solar System — Mars 3D | [Link](https://eyes.nasa.gov/apps/solar-system/#/mars) | No | 200 | ✅ OK | 353 ms |
| `nasa-image-library` | NASA Image and Video Library API | [Link](https://images-api.nasa.gov/search?q=Mars&media_type=image) | No | 200 | ✅ OK | 1225 ms |
| `hirise-operations` | HiRISE Planetary Camera Operations — University of Arizona | [Link](https://hirise.lpl.arizona.edu/) | No | 200 | ✅ OK | 1136 ms |

## Provenance Verification Policy
- Every link has had tracking parameters (`?utm_source=`) stripped per Agent Rule 8.
- Critical data links (`critical: true`) underpin core science models (DEM elevation, MEDA temperature anchor, SWIM ice likelihood, Mars24 ephemeris, MOXIE O₂ extraction).
- In offline environments (`?offline=1`), all dynamic requests fall back to committed fixtures in `public/data/fixtures/`.
