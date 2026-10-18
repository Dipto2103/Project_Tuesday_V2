# MARS LANTERN — Agent Rules

These rules apply to all AI agents and contributors working in this repository.  
Derived from `MARS_LANTERN_SPEC.md` §17.

---

## Core Rules

1. **Inspect First & Migrate:**  
   Always inspect the repository before making changes. Migrate existing data (checkpoints, hazards, rover traverses, coordinates); **never retype or discard existing verified data**. Do not introduce a second map framework (stay strictly on Leaflet 1.9 + React-Leaflet).

2. **Core Science Separation:**  
   Science and deterministic planetary algorithms live in `src/core/` (pure TypeScript, zero React, zero DOM). The UI components must never compute science models inline. This enables code sharing between the frontend web app and the local MCP server.

3. **Honesty & Provenance:**  
   **Never fabricate NASA data.** Every number and metric on screen must carry a provenance badge:
   - `MEASURED`
   - `NASA-DERIVED`
   - `MODELED`
   - `SIMULATED`
   - `UNKNOWN`  
   Unknown terrain or missing data is **never marked as "safe"**.

4. **Specific Scientific Guardrails:**  
   - **Recurring Slope Lineae (RSL):** Per NASA/HiRISE findings, RSL occur on slopes $> 27^\circ$ and represent dry/granular flows. **Never classify RSL as a water resource.** Treat them as hazards / contested science sites.
   - **Temperature:** MOLA/MEDA surface temperature models are labeled engineering estimates (`MODELED`, low confidence, $\pm 15\,\text{K}$ uncertainty), not direct measurements, unless anchored to an in-situ lander/rover log.
   - **Water-Ice Likelihood:** SWIM data represents shallow subsurface ice *likelihood*, not confirmed deposits (outside direct lander measurements like Phoenix).

5. **WMTS Layer Registries:**  
   Do not guess tile URLs. Parse layers from WMTS `GetCapabilities` XML via `scripts/build-layer-registry.ts` and commit `public/data/layers.json`. Always provide an offline fallback basemap (`public/tiles/fallback-global.jpg`).

6. **Credential Security:**  
   Keys must reside in `.env`. Commit `.env.example` only. Remember that `VITE_*` keys are visible in the client-side bundle.

7. **Verification Gate:**  
   Do not claim any feature works until you have actually executed it. Verify changes using `npm test` and `npm run build`, and report the real console output.

8. **Clean Citations:**  
   Strip tracking parameters (such as `?utm_source=chatgpt.com`) from all URLs before committing to datasets or catalogs.

9. **AI Transparency:**  
   Keep `docs/AI_USE.md` updated with all significant AI-assisted architectural changes and feature implementations.
