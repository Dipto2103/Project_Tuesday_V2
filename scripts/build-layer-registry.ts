/**
 * MARS LANTERN — Layer Registry Builder
 * 
 * Generates public/data/layers.json from verified NASA Mars Trek WMTS configurations.
 * Conforms to LayerSchema in src/core/types.ts.
 * 
 * Usage: npx tsx scripts/build-layer-registry.ts
 * Reference: MARS_LANTERN_SPEC.md §5.2
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LayerConfig {
  id: string;
  title: string;
  kind: 'satellite' | 'elevation' | 'slope' | 'geology' | 'polar';
  urlTemplate: string;
  tileSize: number;
  minZoom: number;
  maxNativeZoom: number;
  bbox: [number, number, number, number];
  projection: 'equirectangular';
  attribution: string;
  provenance: 'MEASURED' | 'NASA-DERIVED' | 'MODELED' | 'SIMULATED' | 'UNKNOWN';
  verifiedOn: string;
  active: boolean;
  opacity: number;
  description: string;
  resolutionMetersPerPx: number;
}

export const VERIFIED_LAYERS: LayerConfig[] = [
  {
    id: 'viking-color',
    title: 'Viking Color Mosaic (Global 232m)',
    kind: 'satellite',
    urlTemplate:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    tileSize: 256,
    minZoom: 0,
    maxNativeZoom: 7,
    bbox: [-180, -90, 180, 90],
    projection: 'equirectangular',
    attribution: 'NASA/JPL-Caltech/USGS Astrogeology · Mars Trek',
    provenance: 'NASA-DERIVED',
    verifiedOn: '2026-10-17',
    active: true,
    opacity: 1.0,
    description:
      'Colorized global mosaic compiled from Viking Orbiter images on MDIM 2.1 controlled coordinate network. Standard global planetary basemap.',
    resolutionMetersPerPx: 232
  },
  {
    id: 'mola-shaded-relief',
    title: 'MOLA Shaded Relief (Global 463m)',
    kind: 'elevation',
    urlTemplate:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    tileSize: 256,
    minZoom: 0,
    maxNativeZoom: 7,
    bbox: [-180, -90, 180, 90],
    projection: 'equirectangular',
    attribution: 'NASA GSFC / MGS MOLA Science Team · Mars Trek',
    provenance: 'NASA-DERIVED',
    verifiedOn: '2026-10-17',
    active: false,
    opacity: 0.8,
    description:
      'Global hillshade topographic overlay derived from Mars Global Surveyor MOLA laser altimetry dataset.',
    resolutionMetersPerPx: 463
  },
  {
    id: 'mola-elevation',
    title: 'MOLA Color Topography (Global Elevation)',
    kind: 'elevation',
    urlTemplate:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_DEM_mosaic_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.png',
    tileSize: 256,
    minZoom: 0,
    maxNativeZoom: 7,
    bbox: [-180, -90, 180, 90],
    projection: 'equirectangular',
    attribution: 'NASA GSFC / USGS Astrogeology · Mars Trek',
    provenance: 'NASA-DERIVED',
    verifiedOn: '2026-10-17',
    active: false,
    opacity: 0.65,
    description:
      'Color-coded elevation DEM mosaic from MOLA instrument showing hypsometric terrain relief.',
    resolutionMetersPerPx: 463
  },
  {
    id: 'hirise-jezero-delta',
    title: 'HiRISE Jezero Crater Delta Composite',
    kind: 'satellite',
    urlTemplate:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MRO_HiRISE_JezeroDelta_composite/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    tileSize: 256,
    minZoom: 8,
    maxNativeZoom: 14,
    bbox: [77.2, 18.2, 77.7, 18.6],
    projection: 'equirectangular',
    attribution: 'NASA/JPL-Caltech/Univ. of Arizona · Mars Trek',
    provenance: 'NASA-DERIVED',
    verifiedOn: '2026-10-17',
    active: false,
    opacity: 0.95,
    description:
      'Targeted 25cm/pixel resolution orbital imagery of the Jezero western fan delta deposits.',
    resolutionMetersPerPx: 0.25
  },
  {
    id: 'hirise-gale-crater',
    title: 'HiRISE Gale Crater Traverse Mosaic',
    kind: 'satellite',
    urlTemplate:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MRO_HiRISE_GaleCrater_composite/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    tileSize: 256,
    minZoom: 8,
    maxNativeZoom: 14,
    bbox: [137.2, -4.8, 137.6, -4.4],
    projection: 'equirectangular',
    attribution: 'NASA/JPL-Caltech/Univ. of Arizona · Mars Trek',
    provenance: 'NASA-DERIVED',
    verifiedOn: '2026-10-17',
    active: false,
    opacity: 0.95,
    description:
      'Sub-meter resolution HiRISE orbital mosaic covering Curiosity rover traverse inside Gale Crater.',
    resolutionMetersPerPx: 0.25
  }
];

export function buildLayerRegistry(): void {
  const outputDir = path.resolve(__dirname, '../public/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'layers.json');
  fs.writeFileSync(outputPath, JSON.stringify(VERIFIED_LAYERS, null, 2), 'utf-8');
  console.log(`[build-layer-registry] Wrote ${VERIFIED_LAYERS.length} verified layers to ${outputPath}`);
}

buildLayerRegistry();
