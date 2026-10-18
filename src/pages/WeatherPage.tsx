import React, { useState, useMemo } from 'react';
import {
  CloudSun,
  Thermometer,
  Wind,
  Gauge,
  Sun,
  Radio,
  ExternalLink,
  Sparkles,
  Compass,
  AlertTriangle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';
import { StatCard } from '../components/ui/StatCard';
import { GlassPanel } from '../components/ui/GlassPanel';
import { estimateSurfaceTemperature, MEDA_JEZERO_ANCHOR } from '../core/temperature';
import { calculateMarsSky } from '../core/sky/mars24';
import { ARCHIVED_WEATHER_RECORDS } from '../services/nasaWeather';

export const WeatherPage: React.FC = () => {
  const [selectedSiteIndex, setSelectedSiteIndex] = useState(1); // default Jezero
  const [dustOpticalDepth, setDustOpticalDepth] = useState(0.45); // nominal tau

  const site = ARCHIVED_WEATHER_RECORDS[selectedSiteIndex] || ARCHIVED_WEATHER_RECORDS[1];

  const now = useMemo(() => new Date(), []);
  const skySnapshot = useMemo(() => {
    return calculateMarsSky(now, site.coordinates.latitude, site.coordinates.longitude);
  }, [now, site]);

  const tempEstimate = useMemo(() => {
    return estimateSurfaceTemperature(
      site.coordinates.latitude,
      site.coordinates.elevationMeters || -2500,
      skySnapshot.lsDeg
    );
  }, [site, skySnapshot.lsDeg]);

  // Generate 24-hour diurnal thermal cycle data with ±15 K uncertainty band
  const diurnalData = useMemo(() => {
    const data = [];
    const minC = tempEstimate.minC;
    const maxC = tempEstimate.maxC;
    const swing = maxC - minC;

    for (let h = 0; h < 24; h += 2) {
      // Peak at 14:00 LTST, minimum at 05:00 LTST
      const phase = ((h - 5 + 24) % 24) / 24 * 2 * Math.PI;
      const normalizedTemp = (1 - Math.cos(phase)) / 2;
      const tempC = Math.round(minC + normalizedTemp * swing);
      data.push({
        hour: `${h.toString().padStart(2, '0')}:00`,
        tempC,
        upperBand: tempC + 15,
        lowerBand: tempC - 15
      });
    }
    return data;
  }, [tempEstimate]);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8 text-[#E7E1D8]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(231,225,216,0.10)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CloudSun className="w-5 h-5 text-[#FF7043]" />
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#FF7043]">
              PLANETARY METEOROLOGY SUITE
            </span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase text-white">
            WEATHER TELEMETRY
          </h1>
          <p className="font-sans text-sm text-[#A0A0A0] mt-1">
            Modeled diurnal surface thermal regimes anchored to Perseverance MEDA ground truth
          </p>
        </div>

        <ProvenanceBadge
          type="MODELED"
          source="MOLA Thermal Engine ±15K"
          showIcon={false}
        />
      </div>

      {/* Observation Site Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ARCHIVED_WEATHER_RECORDS.map((rec, idx) => (
          <button
            key={rec.mission}
            type="button"
            onClick={() => setSelectedSiteIndex(idx)}
            className={`p-4 rounded-2xl text-left font-mono transition-all cursor-pointer border ${
              selectedSiteIndex === idx
                ? 'bg-[#15181D] border-[#FF7043] shadow-lg text-white'
                : 'bg-[#15181D]/60 hover:bg-[#1C2027] border-[rgba(231,225,216,0.08)] text-[#A0A0A0]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-display font-bold text-sm text-[#E7E1D8]">
                {rec.mission}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-[#56D9E8]">
                {rec.observationSite}
              </span>
            </div>
            <p className="text-xs text-[#A0A0A0]">
              {rec.coordinates.latitude.toFixed(2)}°N, {rec.coordinates.longitude.toFixed(2)}°E
            </p>
          </button>
        ))}
      </div>

      {/* Main Grid: 24h Diurnal Temperature Chart with ±15 K Uncertainty Band */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 Cols): 24h Temperature Curve */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-[#15181D]/80 border border-[rgba(231,225,216,0.10)] flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[rgba(231,225,216,0.08)] pb-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase text-[#A0A0A0]">
                DIURNAL THERMAL SWING (24-HOUR LTST CYCLE)
              </span>
              <h2 className="text-xl font-display font-bold text-white mt-0.5">
                {site.observationSite} Surface Temperature
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#FFB070]">±15 K Uncertainty Band</span>
              <ProvenanceBadge type="MODELED" source="Allison & McEwen" showIcon={false} />
            </div>
          </div>

          {/* Recharts Diurnal Temperature Curve */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={diurnalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tempBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF7043" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#56D9E8" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke="#6B6F76" tick={{ fontSize: 10, fill: '#A0A0A0' }} />
                <YAxis stroke="#6B6F76" tick={{ fontSize: 10, fill: '#A0A0A0' }} unit="°C" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#101114', borderColor: '#2e3846', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <ReferenceLine y={0} stroke="#6B6F76" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="upperBand" stroke="transparent" fill="#FF7043" fillOpacity={0.15} />
                <Area type="monotone" dataKey="tempC" stroke="#FF7043" strokeWidth={3} fillOpacity={1} fill="url(#tempBand)" />
                <Area type="monotone" dataKey="lowerBand" stroke="transparent" fill="#56D9E8" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[rgba(231,225,216,0.06)] text-center font-mono">
            <div className="p-3 rounded-xl bg-[#101114]">
              <span className="text-[10px] text-[#A0A0A0] uppercase block">PRE-DAWN MIN</span>
              <span className="text-lg font-bold text-[#56D9E8] mt-1 block">{tempEstimate.minC}°C</span>
            </div>
            <div className="p-3 rounded-xl bg-[#101114]">
              <span className="text-[10px] text-[#A0A0A0] uppercase block">DIURNAL MEAN</span>
              <span className="text-lg font-bold text-[#E7E1D8] mt-1 block">{Math.round(tempEstimate.meanC)}°C</span>
            </div>
            <div className="p-3 rounded-xl bg-[#101114]">
              <span className="text-[10px] text-[#A0A0A0] uppercase block">AFTERNOON PEAK</span>
              <span className="text-lg font-bold text-[#FF7043] mt-1 block">{tempEstimate.maxC}°C</span>
            </div>
          </div>
        </div>

        {/* Right Column (4 Cols): In-situ MEDA Anchor & Ephemeris */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* MEDA Ground Truth Anchor Card */}
          <div className="p-6 rounded-3xl bg-[#15181D]/80 border border-[#4ADE80]/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4ADE80]">
                IN-SITU GROUND TRUTH
              </span>
              <ProvenanceBadge type="MEASURED" source="NASA MEDA In-Situ" />
            </div>

            <h3 className="font-display font-bold text-base text-white">
              {MEDA_JEZERO_ANCHOR.name}
            </h3>

            <p className="text-xs text-[#A0A0A0] font-sans leading-relaxed">
              Perseverance rover onboard sensors measured surface ground temperatures from −83°C pre-dawn minimum to +5°C midday peak in Jezero Crater.
            </p>

            <div className="p-3.5 rounded-xl bg-[#101114] border border-[rgba(231,225,216,0.06)] text-xs font-mono space-y-2">
              <div className="flex justify-between">
                <span className="text-[#A0A0A0]">Measured Min:</span>
                <span className="font-bold text-[#56D9E8]">{MEDA_JEZERO_ANCHOR.surfaceMinC}°C (~190 K)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A0A0A0]">Measured Max:</span>
                <span className="font-bold text-[#FF7043]">{MEDA_JEZERO_ANCHOR.surfaceMaxC}°C (~278 K)</span>
              </div>
            </div>

            <a
              href="https://mars.nasa.gov/mars2020/spacecraft/instruments/meda/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#56D9E8] hover:underline"
            >
              <span>Perseverance MEDA Mission Log</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Dust Opacity Slider */}
          <div className="p-6 rounded-3xl bg-[#15181D]/80 border border-[rgba(231,225,216,0.10)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#A0A0A0]">
                ATMOSPHERIC DUST OPTICAL DEPTH
              </span>
              <span className="text-[10px] font-mono text-[#B392F0]">SIMULATED</span>
            </div>

            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#A0A0A0]">Column Opacity (τ):</span>
              <span className="font-bold text-[#FFB070]">{dustOpticalDepth.toFixed(2)}</span>
            </div>

            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.05"
              value={dustOpticalDepth}
              onChange={(e) => setDustOpticalDepth(parseFloat(e.target.value))}
              className="w-full accent-[#FF7043]"
            />

            <p className="text-[11px] text-[#A0A0A0] font-sans">
              {dustOpticalDepth < 0.6
                ? 'Clear skies: nominal direct solar irradiance for photovoltaic recharging.'
                : dustOpticalDepth < 1.5
                ? 'Hazy regional dust: solar array output reduced by 35%.'
                : 'Global planet-encircling dust storm: array output crippled by > 80%.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
