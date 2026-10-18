import React, { useState, useMemo } from 'react';
import {
  X,
  Compass,
  Thermometer,
  ShieldAlert,
  Mountain,
  Pickaxe,
  CheckCircle2,
  AlertTriangle,
  Info,
  Copy,
  Check,
  Navigation,
  Flag,
  Layers
} from 'lucide-react';
import type { LocationReport, ResourceHit, HazardHit } from '../../core/types';
import type { MarsCoordinate } from '../../types/route';
import { formatPlanetocentric } from '../../core/geo';

interface LocationReportDrawerProps {
  report: LocationReport | null;
  isOpen: boolean;
  onClose: () => void;
  onSetStart: (coord: MarsCoordinate) => void;
  onSetDestination: (coord: MarsCoordinate) => void;
  onRadiusChange?: (radiusKm: number) => void;
}

export const LocationReportDrawer: React.FC<LocationReportDrawerProps> = ({
  report,
  isOpen,
  onClose,
  onSetStart,
  onSetDestination,
  onRadiusChange
}) => {
  const [copied, setCopied] = useState(false);
  const [searchRadiusKm, setSearchRadiusKm] = useState(500);

  if (!isOpen || !report) return null;

  const coordObj: MarsCoordinate = {
    latitude: report.lat,
    longitude: report.lonDisplay
  };

  const handleCopyCoord = () => {
    const text = formatPlanetocentric(report.lat, report.lonE);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRadiusSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSearchRadiusKm(val);
    if (onRadiusChange) onRadiusChange(val);
  };

  // Color mappings for provenance badges
  const getProvenanceBadge = (prov: string) => {
    switch (prov) {
      case 'MEASURED':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
            MEASURED
          </span>
        );
      case 'NASA-DERIVED':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-950/80 text-sky-300 border border-sky-500/40">
            NASA-DERIVED
          </span>
        );
      case 'MODELED':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">
            MODELED
          </span>
        );
      case 'SIMULATED':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40">
            SIMULATED
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-600">
            UNKNOWN
          </span>
        );
    }
  };

  // Filter resources based on current slider radius
  const visibleResources = report.resources.items.filter(
    (res) => res.distanceKm <= searchRadiusKm
  );

  return (
    <div className="absolute top-16 right-4 bottom-12 w-96 max-w-[calc(100vw-2rem)] z-[500] bg-mars-dark/95 backdrop-blur-md border border-mars-border rounded-xl shadow-2xl flex flex-col overflow-hidden text-mars-text animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="p-4 border-b border-mars-border flex items-start justify-between bg-mars-surface/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-mars-orange animate-pulse" />
            <h2 className="text-sm font-bold font-mono tracking-wide text-white uppercase">
              Location Report
            </h2>
            {getProvenanceBadge(report.elevationM.provenance)}
          </div>
          <p className="text-xs text-mars-muted font-mono truncate max-w-[260px]">
            {report.nearestFeature
              ? `${report.nearestFeature.name} (${report.nearestFeature.distanceKm} km away)`
              : report.query}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-mars-muted hover:text-white rounded-lg hover:bg-mars-surface transition-colors"
          title="Close Location Report"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs select-text">
        {/* Coordinates Banner */}
        <div className="bg-mars-darkest p-3 rounded-lg border border-mars-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-mars-muted uppercase">Planetary Datum</span>
            <button
              onClick={handleCopyCoord}
              className="flex items-center gap-1 text-[10px] font-mono text-mars-orange hover:text-mars-orange-bright transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="font-mono text-sm font-semibold text-white tracking-wide">
            {formatPlanetocentric(report.lat, report.lonE, 4)}
          </div>
          <div className="text-[11px] font-mono text-mars-sand">
            Display Longitude: {report.lonDisplay >= 0 ? `+${report.lonDisplay}°` : `${report.lonDisplay}°`}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onSetStart(coordObj)}
            className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-950/80 hover:bg-emerald-800 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Flag className="w-3.5 h-3.5 text-emerald-400" />
            <span>Set Start (A)</span>
          </button>
          <button
            onClick={() => onSetDestination(coordObj)}
            className="flex-1 py-1.5 px-2 rounded-lg bg-mars-orange/20 hover:bg-mars-orange/40 text-mars-orange border border-mars-orange/40 text-[11px] font-mono font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Navigation className="w-3.5 h-3.5 text-mars-orange" />
            <span>Set Target (B)</span>
          </button>
        </div>

        {/* Topography & Elevation */}
        <div className="bg-mars-surface/50 p-3 rounded-lg border border-mars-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-white">
              <Mountain className="w-4 h-4 text-sky-400" />
              <span>TOPOGRAPHY & RELIEF</span>
            </div>
            {getProvenanceBadge('NASA-DERIVED')}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-center">
            <div className="bg-mars-darkest p-2 rounded">
              <div className="text-[10px] text-mars-muted">ELEVATION</div>
              <div className="text-xs font-bold text-sky-300">
                {report.elevationM.value !== null ? `${report.elevationM.value} m` : 'N/A'}
              </div>
            </div>
            <div className="bg-mars-darkest p-2 rounded">
              <div className="text-[10px] text-mars-muted">SLOPE</div>
              <div
                className={`text-xs font-bold ${
                  (report.slopeDeg || 0) > 20
                    ? 'text-red-400'
                    : (report.slopeDeg || 0) > 12
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }`}
              >
                {report.slopeDeg !== null ? `${report.slopeDeg}°` : 'N/A'}
              </div>
            </div>
            <div className="bg-mars-darkest p-2 rounded">
              <div className="text-[10px] text-mars-muted">ROUGHNESS</div>
              <div className="text-xs font-bold text-slate-300">
                {report.roughnessM !== null ? `±${report.roughnessM} m` : 'N/A'}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-mars-muted italic">
            MOLA DEM 463m altimetry resolution ({report.elevationM.resolution}).
          </div>
        </div>

        {/* Terrain Quality Score (Spec §8.5) */}
        <div className="bg-mars-surface/50 p-3 rounded-lg border border-mars-border space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-white">
              <Compass className="w-4 h-4 text-mars-orange" />
              <span>TERRAIN QUALITY</span>
            </div>
            {getProvenanceBadge('SIMULATED')}
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`w-14 h-14 rounded-full flex flex-col items-center justify-center font-mono font-bold text-base border-2 ${
                report.terrain.class === 'Favourable'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-950/30'
                  : report.terrain.class === 'Moderate'
                  ? 'border-amber-500 text-amber-300 bg-amber-950/30'
                  : report.terrain.class === 'Difficult'
                  ? 'border-orange-500 text-orange-400 bg-orange-950/30'
                  : 'border-red-500 text-red-400 bg-red-950/30'
              }`}
            >
              <span>{report.terrain.quality !== null ? report.terrain.quality : '—'}</span>
              <span className="text-[8px] font-normal uppercase">/ 100</span>
            </div>
            <div className="space-y-0.5">
              <div className="font-mono text-xs font-bold text-white uppercase">
                {report.terrain.class} Terrain
              </div>
              <p className="text-[11px] text-mars-muted">
                {report.terrain.class === 'Favourable'
                  ? 'Safe for both EVA and pressurized rover operations.'
                  : report.terrain.class === 'Moderate'
                  ? 'Passable with standard rover caution; manage slope limits.'
                  : report.terrain.class === 'Difficult'
                  ? 'Challenging terrain with elevated rockfall or sand sinkage.'
                  : 'Hazardous corridor. Direct traversal discouraged.'}
              </p>
            </div>
          </div>

          {/* Breakdown bars */}
          <div className="space-y-1.5 pt-1 text-[10px] font-mono">
            <div>
              <div className="flex justify-between text-mars-muted">
                <span>Slope Penalty (45%)</span>
                <span>{Math.round(report.terrain.terms.slopeTerm * 100)}%</span>
              </div>
              <div className="w-full bg-mars-darkest h-1.5 rounded overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded"
                  style={{ width: `${Math.min(100, report.terrain.terms.slopeTerm * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-mars-muted">
                <span>Roughness Penalty (25%)</span>
                <span>{Math.round(report.terrain.terms.roughTerm * 100)}%</span>
              </div>
              <div className="w-full bg-mars-darkest h-1.5 rounded overflow-hidden">
                <div
                  className="bg-sky-400 h-full rounded"
                  style={{ width: `${Math.min(100, report.terrain.terms.roughTerm * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-mars-muted">
                <span>Hazard Proximity (20%)</span>
                <span>{Math.round(report.terrain.terms.hazardTerm * 100)}%</span>
              </div>
              <div className="w-full bg-mars-darkest h-1.5 rounded overflow-hidden">
                <div
                  className="bg-red-400 h-full rounded"
                  style={{ width: `${Math.min(100, report.terrain.terms.hazardTerm * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modeled Surface Temperature (Spec §8.6) */}
        <div className="bg-mars-surface/50 p-3 rounded-lg border border-mars-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-white">
              <Thermometer className="w-4 h-4 text-amber-400" />
              <span>SURFACE TEMPERATURE</span>
            </div>
            {getProvenanceBadge('MODELED')}
          </div>

          <div className="bg-amber-950/40 border border-amber-500/30 p-2 rounded text-[11px] font-mono text-amber-200">
            MODELED ESTIMATE · ±15 K UNCERTAINTY
          </div>

          <div className="grid grid-cols-3 gap-2 text-center font-mono pt-1">
            <div className="bg-mars-darkest p-2 rounded">
              <div className="text-[10px] text-mars-muted">PRE-DAWN MIN</div>
              <div className="text-xs font-bold text-sky-300">{report.temperature.minC} °C</div>
            </div>
            <div className="bg-mars-darkest p-2 rounded">
              <div className="text-[10px] text-mars-muted">DIURNAL MEAN</div>
              <div className="text-xs font-bold text-white">{report.temperature.meanC} °C</div>
            </div>
            <div className="bg-mars-darkest p-2 rounded">
              <div className="text-[10px] text-mars-muted">NOON MAX</div>
              <div className="text-xs font-bold text-amber-300">{report.temperature.maxC} °C</div>
            </div>
          </div>

          {report.temperature.anchors.length > 0 && (
            <div className="text-[10px] text-emerald-300 bg-emerald-950/40 p-2 rounded border border-emerald-500/20 font-mono">
              <strong>Measured Anchor:</strong> Verified within {report.temperature.anchors[0].distanceKm} km of {report.temperature.anchors[0].name} (MEDA log).
            </div>
          )}
        </div>

        {/* Nearby Resources (Radius Slider) */}
        <div className="bg-mars-surface/50 p-3 rounded-lg border border-mars-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-white">
              <Pickaxe className="w-4 h-4 text-emerald-400" />
              <span>NEARBY RESOURCES</span>
            </div>
            <span className="font-mono text-xs text-mars-orange font-bold">
              {searchRadiusKm} km
            </span>
          </div>

          {/* Slider */}
          <div className="space-y-1">
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={searchRadiusKm}
              onChange={handleRadiusSlider}
              className="w-full accent-mars-orange cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono text-mars-muted">
              <span>100 km</span>
              <span>1000 km</span>
              <span>2000 km</span>
            </div>
          </div>

          {/* Intersecting Resource Zones */}
          {report.resources.zones.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                Within Resource Zone:
              </div>
              {report.resources.zones.map((zone, zIdx) => (
                <div
                  key={`zone-${zIdx}`}
                  className="bg-emerald-950/40 border border-emerald-500/30 p-2 rounded text-[11px] text-emerald-200 font-mono"
                >
                  ✓ {zone}
                </div>
              ))}
            </div>
          )}

          {/* Detected resources list */}
          <div className="space-y-2 pt-1 max-h-48 overflow-y-auto">
            {visibleResources.length === 0 ? (
              <p className="text-[11px] text-mars-muted italic">
                No specific localized mineral/ice checkpoints cataloged within {searchRadiusKm} km.
              </p>
            ) : (
              visibleResources.map((res, idx) => (
                <div
                  key={`res-${idx}`}
                  className="bg-mars-darkest p-2 rounded border border-mars-border/80 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white capitalize">
                      {res.resourceType.replace('_', ' ')}
                    </span>
                    {getProvenanceBadge(res.provenance)}
                  </div>
                  <div className="text-[11px] text-mars-text">{res.name}</div>
                  <div className="text-[10px] text-mars-muted">{res.detail}</div>
                  <div className="text-[10px] font-mono text-mars-orange">
                    Distance: {res.distanceKm} km
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Nearby Hazards */}
        {report.hazards.length > 0 && (
          <div className="bg-mars-surface/50 p-3 rounded-lg border border-mars-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-red-400">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>NEARBY HAZARDS ({report.hazards.length})</span>
              </div>
              {getProvenanceBadge('NASA-DERIVED')}
            </div>

            <div className="space-y-2 pt-1 max-h-40 overflow-y-auto">
              {report.hazards.map((haz, hIdx) => (
                <div
                  key={`haz-${hIdx}`}
                  className="bg-mars-darkest p-2 rounded border border-red-500/30 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-red-300">
                      {haz.label}
                    </span>
                    <span className="text-[9px] font-mono uppercase px-1 rounded bg-red-950 text-red-400 border border-red-500/40">
                      {haz.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-mars-muted">{haz.detail}</p>
                  <div className="text-[10px] font-mono text-mars-sand">
                    Proximity: {haz.distanceKm} km from point
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
