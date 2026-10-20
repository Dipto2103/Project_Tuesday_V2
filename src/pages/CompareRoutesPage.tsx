import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitCompare,
  Compass,
  Clock,
  Mountain,
  ShieldCheck,
  ArrowRight,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Footprints,
  Plus
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';
import { MarsMap } from '../components/map/MarsMap';
import { useMarsLayers } from '../hooks/useMarsLayers';
import { useRouteStore } from '../state/routeStore';
import {
  buildRouteComparisonTable,
  computeProximityMetrics,
  type RouteProximityMetrics,
  type RouteComparisonTable
} from '../core/route/compare';
import type { RouteResult, RouteError } from '../core/route/types';
import { SCIENCE_CATALOG } from '../data/scienceCatalog';
import { HAZARDS_CATALOG } from '../data/hazardsCatalog';
import type { Checkpoint } from '../core/types';
import type { PlannedRoute } from '../types/route';

export const CompareRoutesPage: React.FC = () => {
  const navigate = useNavigate();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const { activeBaseLayer, activeOverlays } = useMarsLayers();
  const store = useRouteStore();

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/checkpoints.json`)
      .then((r) => r.json())
      .then((data: Checkpoint[]) => setCheckpoints(data))
      .catch((err) => console.warn('[COMPARE] Failed to load checkpoints:', err));
  }, []);

  const successfulRoutes = useMemo(() => {
    return store.results.filter((r): r is RouteResult => (r as any).ok === true);
  }, [store.results]);

  const vehicle = store.request.vehicle || 'eva';

  const comparisonTable: RouteComparisonTable | null = useMemo(() => {
    if (successfulRoutes.length === 0) return null;
    return buildRouteComparisonTable(successfulRoutes, vehicle);
  }, [successfulRoutes, vehicle]);

  // Compute proximity metrics if there are at least two routes (e.g. Plan vs Reference)
  const proximityMetrics: RouteProximityMetrics | null = useMemo(() => {
    if (successfulRoutes.length < 2) return null;
    return computeProximityMetrics(
      successfulRoutes[0].geometry,
      successfulRoutes[1].geometry
    );
  }, [successfulRoutes]);

  // Map representation of primary and alternative routes
  const primaryRoute: PlannedRoute | null = useMemo(() => {
    if (successfulRoutes.length === 0 || successfulRoutes[0].geometry.length === 0) return null;
    const r = successfulRoutes[0];
    const waypoints = r.geometry.map((pt) => ({ latitude: pt.lat, longitude: pt.lonE }));
    return {
      id: 'route-primary',
      name: `${r.mode} Primary`,
      start: waypoints[0],
      destination: waypoints[waypoints.length - 1],
      waypoints,
      distanceKm: r.distanceKm,
      estimatedDurationHours: r.timeHours,
      method: r.mode === 'A_DIRECT' ? 'direct' : r.mode === 'C_ROVER_REFERENCE' ? 'historical-rover-reference' : 'terrain-aware',
      terrainAssessmentAvailable: true,
      maxSlopeDeg: r.maxSlopeDeg ?? undefined,
      averageSlopeDeg: r.meanSlopeDeg ?? undefined,
      cumulativeElevationGainMeters: r.climbM || 0,
      dataLimitations: r.warnings,
      hazardsIntersected: [],
      scienceTargetsNear: []
    };
  }, [successfulRoutes]);

  const alternativeRoute: PlannedRoute | null = useMemo(() => {
    if (successfulRoutes.length < 2 || successfulRoutes[1].geometry.length === 0) return null;
    const r = successfulRoutes[1];
    const waypoints = r.geometry.map((pt) => ({ latitude: pt.lat, longitude: pt.lonE }));
    return {
      id: 'route-alternative',
      name: `${r.mode} Alternative`,
      start: waypoints[0],
      destination: waypoints[waypoints.length - 1],
      waypoints,
      distanceKm: r.distanceKm,
      estimatedDurationHours: r.timeHours,
      method: r.mode === 'A_DIRECT' ? 'direct' : r.mode === 'C_ROVER_REFERENCE' ? 'historical-rover-reference' : 'terrain-aware',
      terrainAssessmentAvailable: true,
      maxSlopeDeg: r.maxSlopeDeg ?? undefined,
      averageSlopeDeg: r.meanSlopeDeg ?? undefined,
      cumulativeElevationGainMeters: r.climbM || 0,
      dataLimitations: r.warnings,
      hazardsIntersected: [],
      scienceTargetsNear: []
    };
  }, [successfulRoutes]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0D10] text-[#E7E1D8] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-12 border-b border-[rgba(231,225,216,0.10)] bg-[#101114] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-xs font-display">
          <span className="font-bold uppercase tracking-wider text-white">ROUTE COMPARISON</span>
          <span className="text-[#6B6F76]">•</span>
          <span className="text-[#56D9E8] font-semibold">Side-by-Side Trade-Off Analysis</span>
        </div>
        <ProvenanceBadge type="MODELED" source="Planetary Multi-Route Comparison Engine" showIcon={false} />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Comparison Panel (480px) */}
        <aside className="w-full lg:w-[480px] bg-[#101114]/98 backdrop-blur-2xl border-b lg:border-b-0 lg:border-r border-[rgba(231,225,216,0.12)] p-5 flex flex-col justify-between shrink-0 overflow-y-auto z-20">
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GitCompare className="w-4 h-4 text-[#56D9E8]" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#56D9E8] uppercase">
                  TRADE-OFF MATRIX
                </span>
              </div>
              <h1 className="font-display font-bold text-lg uppercase text-white">
                TRAVERSE CANDIDATES
              </h1>
            </div>

            {/* Empty State */}
            {successfulRoutes.length === 0 && (
              <div className="p-8 rounded-2xl bg-[#15181D] border border-[rgba(231,225,216,0.10)] text-center space-y-4 my-8">
                <div className="w-12 h-12 rounded-full bg-[#56D9E8]/10 text-[#56D9E8] flex items-center justify-center mx-auto">
                  <Compass className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white mb-1">
                    No routes yet
                  </h3>
                  <p className="text-xs text-[#A0A0A0] font-sans max-w-xs mx-auto">
                    Calculate one or more candidate routes in the Route Planner to evaluate safety trade-offs here.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate('/planner/route')}
                  className="text-xs font-mono font-bold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Go to Route Planner
                </Button>
              </div>
            )}

            {/* Comparison Matrix Table */}
            {comparisonTable && (
              <div className="space-y-4">
                {/* Header Cards for Candidates */}
                <div className="grid grid-cols-2 gap-2">
                  {comparisonTable.routes.map((rt, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                        idx === 0
                          ? 'bg-[#15181D] border-[#56D9E8]/40'
                          : 'bg-[#15181D] border-[#FF7043]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white truncate">{rt.label}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            rt.verdict === 'PASSES SLOPE LIMIT'
                              ? 'bg-[#4ADE80]/20 text-[#4ADE80]'
                              : rt.verdict === 'FAILS'
                              ? 'bg-[#EF4444]/20 text-[#EF4444]'
                              : 'bg-[#EAB308]/20 text-[#EAB308]'
                          }`}
                        >
                          {rt.verdict}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#A0A0A0]">
                        <span>{rt.provenance}</span>
                        <span>{rt.confidence}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Metrics Comparison Table */}
                <div className="rounded-xl border border-[rgba(231,225,216,0.10)] overflow-hidden bg-[#15181D]/80">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#1C2027] text-[#A0A0A0] border-b border-[rgba(231,225,216,0.08)]">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">METRIC</th>
                        {comparisonTable.routes.map((rt, idx) => (
                          <th key={idx} className="py-2.5 px-3 font-semibold text-right">
                            {rt.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(231,225,216,0.06)]">
                      {comparisonTable.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[#1C2027]/50 transition-colors">
                          <td className="py-2.5 px-3 text-[#A0A0A0] font-medium">{row.label}</td>
                          {comparisonTable.routes.map((rt, cIdx) => {
                            const val = row.values[rt.mode] ?? 'N/A';
                            const isBest = row.bestMode === rt.mode;
                            return (
                              <td
                                key={cIdx}
                                className={`py-2.5 px-3 text-right font-bold ${
                                  isBest ? 'text-[#4ADE80]' : 'text-[#E7E1D8]'
                                }`}
                              >
                                {val}
                                {isBest && (
                                  <span className="ml-1 text-[9px] text-[#4ADE80] font-normal">★</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Proximity Metrics Section (Spec §8.5) */}
                {proximityMetrics && (
                  <div className="p-4 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.10)] space-y-2.5 font-mono text-xs">
                    <div className="flex items-center gap-1.5 text-white font-bold">
                      <Footprints className="w-3.5 h-3.5 text-[#56D9E8]" />
                      <span>ROUTE-TO-TRAVERSE PROXIMITY METRICS:</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-[#101114]">
                        <span className="text-[#A0A0A0] block text-[10px]">MEAN OFFSET</span>
                        <span className="font-bold text-[#56D9E8]">{proximityMetrics.meanOffsetKm.toFixed(2)} km</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#101114]">
                        <span className="text-[#A0A0A0] block text-[10px]">MAX HAUSDORFF</span>
                        <span className="font-bold text-white">{proximityMetrics.hausdorffKm.toFixed(2)} km</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#101114]">
                        <span className="text-[#A0A0A0] block text-[10px]">WITHIN 2 KM CORRIDOR</span>
                        <span className="font-bold text-[#4ADE80]">{proximityMetrics.pctWithin2km}%</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#101114]">
                        <span className="text-[#A0A0A0] block text-[10px]">ALONG-TRACK AGREEMENT</span>
                        <span className="font-bold text-[#FFB070]">{proximityMetrics.alongTrackAgreementPct}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-[rgba(231,225,216,0.10)] flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/planner/route')}
              className="flex-1 text-xs font-mono"
            >
              Modify Waypoints
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/planner/briefing')}
              className="flex-1 text-xs font-bold"
            >
              Mission Briefing →
            </Button>
          </div>
        </aside>

        {/* Right Side: Map Canvas */}
        <main className="flex-1 relative h-64 lg:h-full overflow-hidden">
          <MarsMap
            activeBaseLayer={activeBaseLayer}
            activeOverlays={activeOverlays}
            startCoord={
              primaryRoute && primaryRoute.waypoints.length > 0
                ? primaryRoute.waypoints[0]
                : null
            }
            destCoord={
              primaryRoute && primaryRoute.waypoints.length > 0
                ? primaryRoute.waypoints[primaryRoute.waypoints.length - 1]
                : null
            }
            checkpoints={checkpoints}
            primaryRoute={primaryRoute}
            alternativeRoute={alternativeRoute}
            sciencePOIs={SCIENCE_CATALOG}
            hazards={HAZARDS_CATALOG}
            onSelectCoordinate={() => {}}
            onSetStart={() => {}}
            onSetDestination={() => {}}
            onCursorMove={() => {}}
            showRoverTraverses={true}
          />
        </main>
      </div>
    </div>
  );
};
