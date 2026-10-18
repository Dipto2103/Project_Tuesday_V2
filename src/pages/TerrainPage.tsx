import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mountain,
  Search,
  Crosshair,
  TrendingUp,
  AlertTriangle,
  Compass,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';
import { Button } from '../components/ui/Button';
import { parseCoordinateInput } from '../core/search';
import { getElevationM, getSlopeDeg, getRoughnessM } from '../core/dem';
import { calculateTerrainQuality } from '../core/terrain';
import { normalizeLon360 } from '../core/geo';

export const TerrainPage: React.FC = () => {
  const navigate = useNavigate();
  const [coordInput, setCoordInput] = useState('18.44, 77.45');
  const [targetLat, setTargetLat] = useState(18.44);
  const [targetLonE, setTargetLonE] = useState(77.45);
  const [siteName, setSiteName] = useState('Jezero Crater Western Delta');

  const handleSearch = () => {
    const parsed = parseCoordinateInput(coordInput);
    if (parsed) {
      setTargetLat(parsed.lat);
      setTargetLonE(parsed.lonE);
      setSiteName(`Coordinate ${parsed.formatted}`);
    }
  };

  // Compute elevation & terrain metrics
  const elevationResult = useMemo(() => {
    return getElevationM(targetLat, targetLonE);
  }, [targetLat, targetLonE]);

  const slope = useMemo(() => {
    return getSlopeDeg(targetLat, targetLonE);
  }, [targetLat, targetLonE]);

  const roughness = useMemo(() => {
    return getRoughnessM(targetLat, targetLonE);
  }, [targetLat, targetLonE]);

  const assessment = useMemo(() => {
    return calculateTerrainQuality({
      slopeDeg: slope,
      roughnessM: roughness
    });
  }, [slope, roughness]);

  // Terrain Quality Score (0 - 100)
  const qualityScore = assessment.quality ?? 75;

  // Elevation Profile Chart Data (synthesized slice across local 20 km)
  const profileData = useMemo(() => {
    const pts = [];
    for (let d = -10; d <= 10; d += 2) {
      const latOffset = targetLat + d * 0.016;
      const elev = getElevationM(latOffset, targetLonE).value;
      pts.push({
        distKm: `${d} km`,
        elevation: elev
      });
    }
    return pts;
  }, [targetLat, targetLonE]);

  const slopeRating = `${slope.toFixed(1)}° (${slope < 10 ? 'Gentle' : slope < 20 ? 'Moderate' : 'Steep'})`;
  const roughnessRating = `${roughness} m (${roughness < 25 ? 'Low Regolith' : 'Boulders & Scree'})`;

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8 text-[#E7E1D8]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(231,225,216,0.10)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Mountain className="w-5 h-5 text-[#56D9E8]" />
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#56D9E8]">
              ALTIMETRY & TOPOGRAPHY ENGINE
            </span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase text-white">
            TERRAIN ANALYSIS
          </h1>
          <p className="font-sans text-sm text-[#A0A0A0] mt-1">
            MOLA laser altimeter elevation and surface traversability scoring
          </p>
        </div>

        <ProvenanceBadge type="NASA-DERIVED" source="MOLA 128 ppd Global DEM" showIcon={false} />
      </div>

      {/* Coordinate Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-2xl bg-[#15181D]/90 border border-[rgba(231,225,216,0.12)]">
        <Crosshair className="w-5 h-5 text-[#FF7043] shrink-0 hidden sm:block" />
        <input
          type="text"
          value={coordInput}
          onChange={(e) => setCoordInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Enter Martian coordinate (e.g. 18.44°N 77.45°E or -4.59, 137.44)..."
          className="flex-1 bg-transparent text-sm font-mono text-[#E7E1D8] placeholder-[#6B6F76] focus:outline-none w-full"
        />
        <Button variant="primary" size="sm" onClick={handleSearch} className="shrink-0 text-xs w-full sm:w-auto">
          Analyze Coordinate
        </Button>
      </div>

      {/* Main Grid: Quality Score & Component Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5 Cols): Terrain Quality Gauge */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#15181D]/80 border border-[rgba(231,225,216,0.10)] flex flex-col items-center justify-between text-center gap-6">
          <div className="w-full flex items-center justify-between border-b border-[rgba(231,225,216,0.08)] pb-3">
            <span className="text-xs font-mono font-bold text-[#A0A0A0] uppercase">
              TRAVERSABILITY SCORE
            </span>
            <ProvenanceBadge type="MODELED" source="ARES Composite Cost" showIcon={false} />
          </div>

          {/* Big Quality Ring */}
          <div className="relative my-4 flex items-center justify-center">
            <svg width="180" height="180" viewBox="0 0 160 160" className="transform -rotate-90">
              <circle cx="80" cy="80" r="66" fill="transparent" stroke="#1C2027" strokeWidth="12" />
              <circle
                cx="80"
                cy="80"
                r="66"
                fill="transparent"
                stroke={qualityScore > 70 ? '#4ADE80' : qualityScore > 40 ? '#F5B544' : '#EF4444'}
                strokeWidth="12"
                strokeDasharray={2 * Math.PI * 66}
                strokeDashoffset={2 * Math.PI * 66 * (1 - qualityScore / 100)}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-5xl font-mono font-bold text-white tracking-tight">
                {qualityScore}
              </span>
              <span className="text-xs font-mono text-[#A0A0A0] uppercase mt-1">/ 100 Quality</span>
            </div>
          </div>

          {/* Site Readout */}
          <div className="w-full p-4 rounded-xl bg-[#101114] border border-[rgba(231,225,216,0.06)] text-left font-mono text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#A0A0A0]">Site:</span>
              <span className="font-bold text-[#E7E1D8]">{siteName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A0A0A0]">Datum Elevation:</span>
              <span className="font-bold text-[#56D9E8]">{elevationResult.value > 0 ? '+' : ''}{elevationResult.value.toLocaleString()} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A0A0A0]">Terrain Class:</span>
              <span className="font-bold text-[#FFB070]">{assessment.class}</span>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Term Bars & Elevation Profile */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Four Term Bars */}
          <div className="p-6 rounded-3xl bg-[#15181D]/80 border border-[rgba(231,225,216,0.10)] space-y-4">
            <span className="text-xs font-mono font-bold text-[#A0A0A0] uppercase tracking-wider block">
              TERRAIN RISK FACTOR BREAKDOWN
            </span>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#A0A0A0]">Surface Slope Gradient:</span>
                  <span className="font-bold text-[#4ADE80]">{slopeRating}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#101114] overflow-hidden">
                  <div className="h-full bg-[#4ADE80] rounded-full" style={{ width: '35%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#A0A0A0]">Surface Roughness & Scree:</span>
                  <span className="font-bold text-[#56D9E8]">{roughnessRating}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#101114] overflow-hidden">
                  <div className="h-full bg-[#56D9E8] rounded-full" style={{ width: '45%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#A0A0A0]">Local Obstacle / Scarp Hazard:</span>
                  <span className="font-bold text-[#4ADE80]">Low Hazard (0.15)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#101114] overflow-hidden">
                  <div className="h-full bg-[#4ADE80] rounded-full" style={{ width: '15%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#A0A0A0]">DEM Interpolation Uncertainty:</span>
                  <span className="font-bold text-[#FFB070]">±12 m (MOLA laser shot)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#101114] overflow-hidden">
                  <div className="h-full bg-[#FFB070] rounded-full" style={{ width: '22%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Elevation Profile Chart */}
          <div className="p-6 rounded-3xl bg-[#15181D]/80 border border-[rgba(231,225,216,0.10)]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-bold text-[#A0A0A0] uppercase tracking-wider">
                20-KM LOCAL TRANSECT ELEVATION PROFILE
              </span>
              <span className="text-[10px] font-mono text-[#56D9E8]">MOLA DEM TRANSECT</span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={profileData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#56D9E8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#56D9E8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="distKm" stroke="#6B6F76" tick={{ fontSize: 10, fill: '#A0A0A0' }} />
                  <YAxis stroke="#6B6F76" tick={{ fontSize: 10, fill: '#A0A0A0' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#101114', borderColor: '#2e3846', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Area type="monotone" dataKey="elevation" stroke="#56D9E8" strokeWidth={2} fillOpacity={1} fill="url(#elevGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
