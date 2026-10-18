import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sun,
  Moon,
  Clock,
  Compass,
  Eye,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { MarsSkyCanvas } from './MarsSkyCanvas';
import { calculateMarsSky, type MarsSkySnapshot } from '../../core/sky/mars24';
import { SourceBadge } from '../common/SourceBadge';

interface SkyPanelProps {
  observerLat?: number;
  observerLonE?: number;
  observerName?: string;
  onCenterMap?: (lat: number, lon: number) => void;
}

export const SkyPanel: React.FC<SkyPanelProps> = ({
  observerLat = 18.44,
  observerLonE = 77.45,
  observerName = 'Jezero Crater (Perseverance Site)',
  onCenterMap
}) => {
  const [activeTab, setActiveTab] = useState<'dome' | 'orbit' | 'news'>('dome');
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [tau, setTau] = useState<number>(0.5); // Optical depth
  const [stars, setStars] = useState<any[]>([]);
  const [timeOffsetHours, setTimeOffsetHours] = useState<number>(0);

  // Load stars catalog
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/stars.json`)
      .then((r) => r.json())
      .then((data) => setStars(data))
      .catch((err) => console.warn('[MARS SKY] Could not load stars.json:', err));
  }, []);

  // Compute active snapshot
  const activeDate = useMemo(() => {
    return new Date(currentTimeMs + timeOffsetHours * 3600 * 1000);
  }, [currentTimeMs, timeOffsetHours]);

  const skySnapshot: MarsSkySnapshot = useMemo(() => {
    return calculateMarsSky(activeDate, observerLat, observerLonE);
  }, [activeDate, observerLat, observerLonE]);

  // Play animation loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      // Step forward by 10 martian minutes (0.166 hours)
      setTimeOffsetHours((prev) => (prev + 0.166) % (24.66 * 100));
    }, 120);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleResetToNow = useCallback(() => {
    setIsPlaying(false);
    setCurrentTimeMs(Date.now());
    setTimeOffsetHours(0);
  }, []);

  const handleJumpSol = useCallback((deltaSols: number) => {
    setTimeOffsetHours((prev) => prev + deltaSols * 24.6598);
  }, []);

  return (
    <div className="space-y-6 text-mars-text">
      {/* Header & Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-mars-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-mars-orange" />
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-white">
              Dynamic Mars Sky & Ephemeris
            </h2>
          </div>
          <p className="text-xs text-mars-muted font-mono mt-0.5">
            Observing from <span className="text-mars-sand font-bold">{observerName}</span> ({observerLat.toFixed(2)}°N, {observerLonE.toFixed(2)}°E)
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-mars-surface p-1 rounded-lg border border-mars-border">
          <button
            onClick={() => setActiveTab('dome')}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
              activeTab === 'dome'
                ? 'bg-mars-orange text-white font-bold shadow'
                : 'text-mars-muted hover:text-white'
            }`}
          >
            Hemisphere Dome
          </button>
          <button
            onClick={() => setActiveTab('orbit')}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
              activeTab === 'orbit'
                ? 'bg-mars-orange text-white font-bold shadow'
                : 'text-mars-muted hover:text-white'
            }`}
          >
            NASA Eyes Orbit
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
              activeTab === 'news'
                ? 'bg-mars-orange text-white font-bold shadow'
                : 'text-mars-muted hover:text-white'
            }`}
          >
            Sky Science
          </button>
        </div>
      </div>

      {activeTab === 'dome' && (
        <>
          {/* Provenance & Citation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <SourceBadge
              status={skySnapshot.provenance}
              sourceName="Allison & McEwen (2000) Mars24 Alg"
              sourceUrl="https://www.giss.nasa.gov/tools/mars24/help/algorithm.html"
            />
            <span className="text-[10px] text-mars-muted">
              Mars Year {skySnapshot.marsYear} · Sol {skySnapshot.sol} · Ls {skySnapshot.lsDeg}°
            </span>
          </div>

          {/* Interactive Sky Canvas */}
          <MarsSkyCanvas
            sky={skySnapshot}
            stars={stars}
            tau={tau}
            className="shadow-2xl"
          />

          {/* Time Controls Bar */}
          <div className="p-4 rounded-xl bg-mars-surface border border-mars-border space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition-all ${
                    isPlaying
                      ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                      : 'bg-mars-dark border-mars-border text-white hover:border-mars-orange'
                  }`}
                  aria-label={isPlaying ? 'Pause time animation' : 'Play time animation'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'PAUSE' : 'SIMULATE'}</span>
                </button>
                <button
                  onClick={handleResetToNow}
                  className="px-2.5 py-1.5 rounded-lg bg-mars-dark border border-mars-border text-mars-muted hover:text-white flex items-center gap-1"
                  title="Reset to current UTC"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Now</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleJumpSol(-1)}
                  className="px-2 py-1 rounded bg-mars-dark border border-mars-border text-mars-muted hover:text-white"
                >
                  -1 Sol
                </button>
                <span className="text-mars-orange font-bold px-1">Sol {skySnapshot.sol}</span>
                <button
                  onClick={() => handleJumpSol(1)}
                  className="px-2 py-1 rounded bg-mars-dark border border-mars-border text-mars-muted hover:text-white"
                >
                  +1 Sol
                </button>
              </div>
            </div>

            {/* Scrub LTST Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-mars-muted flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-mars-cyan" />
                  Local True Solar Time (LTST):
                </span>
                <span className="text-mars-cyan font-bold text-sm tracking-wider">
                  {skySnapshot.ltst}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="0.05"
                value={skySnapshot.ltstHours}
                onChange={(e) => {
                  setIsPlaying(false);
                  const targetH = parseFloat(e.target.value);
                  const diffH = targetH - skySnapshot.ltstHours;
                  setTimeOffsetHours((prev) => prev + diffH);
                }}
                className="w-full accent-mars-orange h-1.5 bg-mars-dark rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-mars-muted">
                <span>00:00 (Midnight)</span>
                <span>06:00 (Dawn)</span>
                <span>12:00 (Noon)</span>
                <span>18:00 (Dusk)</span>
                <span>24:00</span>
              </div>
            </div>

            {/* Atmospheric Dust Opacity Slider */}
            <div className="space-y-1 pt-2 border-t border-mars-border/50">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-mars-muted flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-mars-sand" />
                  Atmospheric Dust Opacity (&tau;):
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
                    SIMULATED
                  </span>
                  <span className="text-white font-bold">{tau.toFixed(2)}</span>
                </div>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={tau}
                onChange={(e) => setTau(parseFloat(e.target.value))}
                className="w-full accent-mars-sand h-1.5 bg-mars-dark rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Ephemeris & Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            {/* Season & Ls */}
            <div className="p-3 rounded-xl bg-mars-surface border border-mars-border space-y-1">
              <div className="text-[10px] text-mars-muted">SOLAR LONGITUDE (Ls)</div>
              <div className="text-sm font-bold text-mars-sand">{skySnapshot.lsDeg}°</div>
              <div className="text-[10px] text-mars-muted/80 truncate">{skySnapshot.season.split('/')[0]}</div>
            </div>

            {/* Sun Elevation */}
            <div className="p-3 rounded-xl bg-mars-surface border border-mars-border space-y-1">
              <div className="text-[10px] text-mars-muted">SUN ELEVATION</div>
              <div className={`text-sm font-bold ${skySnapshot.isDaylight ? 'text-amber-400' : 'text-slate-400'}`}>
                {skySnapshot.sunElevationDeg.toFixed(1)}°
              </div>
              <div className="text-[10px] text-mars-muted/80">
                Az: {skySnapshot.sunAzimuthDeg.toFixed(0)}° ({skySnapshot.isDaylight ? 'Daylight' : 'Night'})
              </div>
            </div>

            {/* Daylight Length */}
            <div className="p-3 rounded-xl bg-mars-surface border border-mars-border space-y-1">
              <div className="text-[10px] text-mars-muted">DAYLIGHT WINDOW</div>
              <div className="text-sm font-bold text-white">{skySnapshot.daylightHours.toFixed(1)} hrs</div>
              <div className="text-[10px] text-mars-muted/80">
                Rise {skySnapshot.sunriseLtst ?? 'N/A'} · Set {skySnapshot.sunsetLtst ?? 'N/A'}
              </div>
            </div>

            {/* Earth Visibility */}
            <div className="p-3 rounded-xl bg-mars-surface border border-mars-border space-y-1">
              <div className="text-[10px] text-mars-muted">EARTH POSITION</div>
              <div className="text-sm font-bold text-sky-400 truncate">
                {skySnapshot.earth.appearance.replace('_', ' ').toUpperCase()}
              </div>
              <div className="text-[10px] text-mars-muted/80">
                Elongation: {skySnapshot.earth.elongationDeg}°
              </div>
            </div>
          </div>

          {/* Natural Satellites Status Card */}
          <div className="p-4 rounded-xl bg-mars-surface border border-mars-border space-y-3 font-mono text-xs">
            <h3 className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Moon className="w-4 h-4 text-mars-sand" />
              Martian Moons (Phobos & Deimos)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Phobos */}
              <div className="p-3 rounded-lg bg-mars-dark/80 border border-mars-border/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-mars-sand">PHOBOS (Fear)</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    skySnapshot.phobos.isAboveHorizon ? 'bg-emerald-950/60 text-emerald-400' : 'bg-rose-950/40 text-rose-400'
                  }`}>
                    {skySnapshot.phobos.isAboveHorizon ? 'ABOVE HORIZON' : 'BELOW HORIZON'}
                  </span>
                </div>
                <div className="text-[11px] text-mars-muted">
                  Orbits in 7.65 h — <span className="text-amber-300 font-semibold">rises in West, sets in East</span> (~2x per sol).
                </div>
                <div className="text-[10px] text-mars-muted/80 flex justify-between pt-1 border-t border-mars-border/40">
                  <span>Elev: {skySnapshot.phobos.elevationDeg}°</span>
                  <span>Phase: {skySnapshot.phobos.phase}</span>
                </div>
              </div>

              {/* Deimos */}
              <div className="p-3 rounded-lg bg-mars-dark/80 border border-mars-border/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">DEIMOS (Panic)</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    skySnapshot.deimos.isAboveHorizon ? 'bg-emerald-950/60 text-emerald-400' : 'bg-rose-950/40 text-rose-400'
                  }`}>
                    {skySnapshot.deimos.isAboveHorizon ? 'ABOVE HORIZON' : 'BELOW HORIZON'}
                  </span>
                </div>
                <div className="text-[11px] text-mars-muted">
                  Orbits in 30.3 h — rises in East, sets in West (stays visible ~2.7 sols).
                </div>
                <div className="text-[10px] text-mars-muted/80 flex justify-between pt-1 border-t border-mars-border/40">
                  <span>Elev: {skySnapshot.deimos.elevationDeg}°</span>
                  <span>Phase: {skySnapshot.deimos.phase}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'orbit' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-mars-muted">
              Live 3D celestial perspective rendered by NASA Eyes on the Solar System:
            </span>
            <a
              href="https://eyes.nasa.gov/apps/solar-system/#/mars"
              target="_blank"
              rel="noreferrer"
              className="text-mars-orange hover:underline flex items-center gap-1"
            >
              <span>Open in Fullscreen</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="relative w-full h-[480px] rounded-xl overflow-hidden border border-mars-border bg-black">
            <iframe
              src="https://eyes.nasa.gov/apps/solar-system/#/mars?embed=true"
              title="NASA Eyes on the Solar System - Mars"
              className="w-full h-full border-0"
              loading="lazy"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </div>
      )}

      {activeTab === 'news' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-mars-surface border border-mars-border space-y-3">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-mars-cyan" />
              Planetary Celestial Science Intel
            </h3>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-mars-dark/80 border border-mars-border">
                <div className="font-bold text-mars-sand text-xs">Blue Martian Sunsets</div>
                <p className="text-[11px] text-mars-muted mt-1 leading-relaxed">
                  Unlike Earth where Rayleigh scattering makes the sky blue and sunsets red, the fine iron-oxide dust in the Martian atmosphere scatters red light efficiently across the sky. Near the Sun, forward Mie scattering by micro-particles creates a characteristic pale-blue halo around dawn and twilight.
                </p>
                <div className="text-[10px] text-mars-orange mt-1">Source: NASA JPL / Curiosity Mastcam Observations</div>
              </div>

              <div className="p-3 rounded-lg bg-mars-dark/80 border border-mars-border">
                <div className="font-bold text-mars-sand text-xs">MAVEN Auroras & Atmospheric Sputtering</div>
                <p className="text-[11px] text-mars-muted mt-1 leading-relaxed">
                  NASA MAVEN has detected widespread diffuse auroras spanning across the Martian nightside, driven by energetic solar particles penetrating directly into the thin CO₂ atmosphere without a global dipolar magnetic field.
                </p>
                <div className="text-[10px] text-mars-orange mt-1">Source: NASA Goddard Space Flight Center / MAVEN Mission</div>
              </div>

              <div className="p-3 rounded-lg bg-mars-dark/80 border border-mars-border">
                <div className="font-bold text-mars-sand text-xs">Comet 3I/ATLAS & Mars Orbit Encounters</div>
                <p className="text-[11px] text-mars-muted mt-1 leading-relaxed">
                  Orbital flybys of long-period comets create intense meteoroid deposition in the upper atmosphere, tracked by Mars orbiters and surface rover cameras.
                </p>
                <div className="text-[10px] text-mars-orange mt-1">Source: NASA PDS Planetary Atmospheres Node</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
