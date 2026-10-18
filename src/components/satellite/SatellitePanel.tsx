import React, { useState, useEffect, useRef } from 'react';
import {
  Satellite,
  Layers,
  Sliders,
  ExternalLink,
  Search,
  Image as ImageIcon,
  Compass,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Maximize2
} from 'lucide-react';
import L from 'leaflet';
import { fetchJson, type Origin } from '../../core/safeFetch';
import { SourceBadge } from '../common/SourceBadge';
import { lon360ToDisplay, normalizeLon360 } from '../../core/geo';

interface LayerMeta {
  id: string;
  title: string;
  kind: string;
  urlTemplate: string;
  tileSize: number;
  minZoom: number;
  maxNativeZoom: number;
  bbox: [number, number, number, number];
  projection: string;
  attribution: string;
  provenance: string;
}

interface NasaImageItem {
  title: string;
  nasaId: string;
  dateCreated: string;
  description: string;
  creator: string;
  thumbnailUrl: string;
}

interface SatellitePanelProps {
  targetLat?: number;
  targetLon?: number;
  targetName?: string;
  onCenterMap?: (lat: number, lon: number) => void;
}

export const SatellitePanel: React.FC<SatellitePanelProps> = ({
  targetLat = 18.44,
  targetLon = 77.45,
  targetName = 'Jezero Crater',
  onCenterMap
}) => {
  const [layers, setLayers] = useState<LayerMeta[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('viking-color');
  const [compareLayerId, setCompareLayerId] = useState<string>('mola-color-hillshade');
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage

  const [nasaImages, setNasaImages] = useState<NasaImageItem[]>([]);
  const [imagesOrigin, setImagesOrigin] = useState<Origin>('fixture');
  const [isLoadingImages, setIsLoadingImages] = useState<boolean>(false);

  const minimapContainerRef = useRef<HTMLDivElement | null>(null);
  const minimapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const compareTileLayerRef = useRef<L.TileLayer | null>(null);
  const ringsGroupRef = useRef<L.LayerGroup | null>(null);

  // Load layer registry
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/layers.json`)
      .then((r) => r.json())
      .then((data: LayerMeta[]) => {
        setLayers(data);
      })
      .catch((err) => console.warn('[SATELLITE] Failed to load layers.json:', err));
  }, []);

  // Fetch dynamic NASA images for target
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingImages(true);

    const query = encodeURIComponent(`${targetName} Mars`);
    const apiUrl = `https://images-api.nasa.gov/search?q=${query}&media_type=image`;
    const fixturePath = 'data/fixtures/nasa_images_default.json';

    fetchJson<any>(apiUrl, { fixturePath, timeoutMs: 8000 })
      .then(({ data, origin }) => {
        if (isCancelled) return;
        setImagesOrigin(origin);

        const items: NasaImageItem[] = [];
        const rawItems = data?.collection?.items || [];

        for (const item of rawItems.slice(0, 6)) {
          const d = item.data?.[0];
          const l = item.links?.[0];
          if (d && l) {
            items.push({
              title: d.title || 'Mars Orbital Observation',
              nasaId: d.nasa_id || '',
              dateCreated: d.date_created ? d.date_created.split('T')[0] : '',
              description: d.description || '',
              creator: d.secondary_creator || d.center || 'NASA/JPL',
              thumbnailUrl: l.href || ''
            });
          }
        }
        setNasaImages(items);
        setIsLoadingImages(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.warn('[SATELLITE] NASA Images API error:', err);
        setIsLoadingImages(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [targetName]);

  // Setup Leaflet minimap
  useEffect(() => {
    if (!minimapContainerRef.current) return;
    if (minimapInstanceRef.current) return;

    const displayLon = lon360ToDisplay(targetLon);

    const map = L.map(minimapContainerRef.current, {
      crs: L.CRS.EPSG4326,
      center: [targetLat, displayLon],
      zoom: 5,
      minZoom: 1,
      maxZoom: 9,
      zoomControl: false,
      attributionControl: false,
      maxBounds: [
        [-90, -180],
        [90, 180]
      ],
      maxBoundsViscosity: 1.0
    });

    minimapInstanceRef.current = map;

    // Rings group for 10km, 50km, 100km range circles
    const ringsGroup = L.layerGroup().addTo(map);
    ringsGroupRef.current = ringsGroup;

    return () => {
      map.remove();
      minimapInstanceRef.current = null;
    };
  }, [targetLat, targetLon]);

  // Update center & range rings
  useEffect(() => {
    const map = minimapInstanceRef.current;
    if (!map) return;

    const displayLon = lon360ToDisplay(targetLon);
    map.setView([targetLat, displayLon]);

    if (ringsGroupRef.current) {
      ringsGroupRef.current.clearLayers();

      // 10 km ring (tactical rover EVA)
      L.circle([targetLat, displayLon], {
        radius: 10000,
        color: '#ffb070',
        weight: 1.5,
        dashArray: '4, 4',
        fill: false
      }).bindTooltip('10 km EVA Limit', { permanent: false, direction: 'top' }).addTo(ringsGroupRef.current);

      // 50 km ring (regional exploration)
      L.circle([targetLat, displayLon], {
        radius: 50000,
        color: '#f08a50',
        weight: 1.5,
        dashArray: '6, 6',
        fill: false
      }).bindTooltip('50 km Regional Zone', { permanent: false, direction: 'top' }).addTo(ringsGroupRef.current);

      // 100 km ring (strategic perimeter)
      L.circle([targetLat, displayLon], {
        radius: 100000,
        color: '#38bdf8',
        weight: 1.5,
        dashArray: '8, 8',
        fill: false
      }).bindTooltip('100 km Strategic Horizon', { permanent: false, direction: 'top' }).addTo(ringsGroupRef.current);

      // Center crosshair
      L.circleMarker([targetLat, displayLon], {
        radius: 5,
        color: '#ffffff',
        fillColor: '#f08a50',
        fillOpacity: 1,
        weight: 2
      }).addTo(ringsGroupRef.current);
    }
  }, [targetLat, targetLon]);

  // Update base tile layer
  useEffect(() => {
    const map = minimapInstanceRef.current;
    if (!map || layers.length === 0) return;

    const layerMeta = layers.find((l) => l.id === selectedLayerId) || layers[0];
    if (!layerMeta) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newLayer = L.tileLayer(layerMeta.urlTemplate, {
      noWrap: true,
      bounds: [
        [-90, -180],
        [90, 180]
      ],
      tileSize: layerMeta.tileSize || 256,
      maxNativeZoom: layerMeta.maxNativeZoom || 7
    });

    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
  }, [selectedLayerId, layers]);

  const activeLayerMeta = layers.find((l) => l.id === selectedLayerId);
  const compareLayerMeta = layers.find((l) => l.id === compareLayerId);

  return (
    <div className="space-y-6 text-mars-text">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-mars-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Satellite className="w-5 h-5 text-mars-cyan" />
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-white">
              Planetary Satellite Intel
            </h2>
          </div>
          <p className="text-xs text-mars-muted font-mono mt-0.5">
            Orbital remote sensing at <span className="text-mars-sand font-bold">{targetName}</span> ({targetLat.toFixed(2)}°N, {targetLon.toFixed(2)}°E)
          </p>
        </div>

        {/* Global Links */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <a
            href={`https://trek.nasa.gov/mars/#v=0.1&x=${targetLon}&y=${targetLat}&z=5&p=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A104905&d=`}
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-lg bg-mars-surface border border-mars-border hover:border-mars-orange text-mars-muted hover:text-white flex items-center gap-1.5 transition-all"
          >
            <span>Mars Trek</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://hirise.lpl.arizona.edu/"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-lg bg-mars-surface border border-mars-border hover:border-mars-orange text-mars-muted hover:text-white flex items-center gap-1.5 transition-all"
          >
            <span>HiRISE</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Layer Switcher & Provenance */}
      <div className="p-4 rounded-xl bg-mars-surface border border-mars-border space-y-3 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-mars-orange" />
            Orbital Basemap Layer
          </span>

          {activeLayerMeta && (
            <SourceBadge
              status={(activeLayerMeta.provenance as any) || 'NASA-DERIVED'}
              sourceName={activeLayerMeta.attribution}
            />
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {layers.map((l) => (
            <button
              key={l.id}
              onClick={() => setSelectedLayerId(l.id)}
              className={`p-2 rounded-lg border text-left transition-all ${
                selectedLayerId === l.id
                  ? 'bg-mars-dark border-mars-orange text-white shadow-md'
                  : 'bg-mars-dark/50 border-mars-border text-mars-muted hover:text-white'
              }`}
            >
              <div className="font-bold truncate text-[11px]">{l.title.split('(')[0]}</div>
              <div className="text-[9px] text-mars-muted/80 uppercase">{l.kind} · Max z{l.maxNativeZoom}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Minimap Viewport with Range Rings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-mars-muted flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-mars-orange" />
            Target Site Minimap (10 km / 50 km / 100 km Rings):
          </span>
          <button
            onClick={() => onCenterMap?.(targetLat, targetLon)}
            className="text-mars-orange hover:underline text-[11px] flex items-center gap-1"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Center Primary Map</span>
          </button>
        </div>

        <div className="relative w-full h-72 rounded-xl overflow-hidden border border-mars-border shadow-2xl bg-black">
          <div ref={minimapContainerRef} className="w-full h-full" />
        </div>
      </div>

      {/* Dynamic NASA Imagery Search */}
      <div className="p-4 rounded-xl bg-mars-surface border border-mars-border space-y-4 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mars-border/60 pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-mars-sand" />
            <h3 className="font-bold text-white uppercase tracking-wider">
              NASA Planetary Archive Imagery ({targetName})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
              imagesOrigin === 'live'
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                : imagesOrigin === 'cache'
                ? 'bg-sky-950/60 text-sky-400 border border-sky-800/40'
                : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
            }`}>
              Origin: {imagesOrigin.toUpperCase()}
            </span>
          </div>
        </div>

        {isLoadingImages ? (
          <div className="text-center py-8 text-mars-muted animate-pulse">
            Querying NASA Image and Video Library...
          </div>
        ) : nasaImages.length === 0 ? (
          <div className="text-center py-6 text-mars-muted">
            No specific imagery returned for &quot;{targetName}&quot;. Showing default orbital catalog.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {nasaImages.map((img) => (
              <div
                key={img.nasaId || img.title}
                className="rounded-lg bg-mars-dark border border-mars-border overflow-hidden flex flex-col group hover:border-mars-sand transition-all"
              >
                <div className="relative aspect-video bg-black/60 overflow-hidden">
                  <img
                    src={img.thumbnailUrl}
                    alt={img.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <span className="absolute bottom-1 right-1 text-[9px] bg-black/80 px-1 rounded text-white font-mono">
                    {img.dateCreated || 'NASA Archive'}
                  </span>
                </div>
                <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5">
                  <div className="font-bold text-white line-clamp-1 text-[11px]" title={img.title}>
                    {img.title}
                  </div>
                  <p className="text-[10px] text-mars-muted line-clamp-2 leading-tight">
                    {img.description}
                  </p>
                  <div className="text-[9px] text-mars-sand/80 pt-1 border-t border-mars-border/40 truncate">
                    {img.creator}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
