import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Thermometer,
  Wind,
  Gauge,
  ChevronDown,
  Layers,
  Route,
  ShieldCheck,
  BookOpen,
  Mountain,
  Orbit,
  ArrowRight,
  MapPin,
  Compass,
  Sparkles
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { GlassPanel } from '../components/ui/GlassPanel';
import { StatCard } from '../components/ui/StatCard';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';
import { Footer } from '../components/layout/Footer';
import { calculateMarsSky } from '../core/sky/mars24';
import { estimateSurfaceTemperature } from '../core/temperature';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  // Real ephemeris & temperature models for default site (Jezero Crater 18.44°N, 77.45°E)
  const now = useMemo(() => new Date(), []);
  const skySnapshot = useMemo(() => calculateMarsSky(now, 18.4447, 77.4508), [now]);
  const tempEstimate = useMemo(() => estimateSurfaceTemperature(18.4447, -2500, skySnapshot.lsDeg), [skySnapshot.lsDeg]);

  // Derived environmental telemetry
  const avgTempFormatted = `${Math.round(tempEstimate.meanC)}°C`;
  const dustRiskFormatted = skySnapshot.lsDeg >= 180 && skySnapshot.lsDeg <= 320 ? 'Moderate' : 'Low Risk';
  const solNumber = Math.floor(skySnapshot.msd % 1000);

  // Featured checkpoints
  const featuredCheckpoints = [
    {
      id: 'jezero',
      name: 'Jezero Crater Delta',
      category: 'Landing Site',
      lat: 18.44,
      lon: 77.45,
      desc: 'Western Fan Delta explored by NASA Perseverance rover. Rich in smectite clays and carbonate biosignature targets.',
      elevation: '-2,500 m'
    },
    {
      id: 'gale',
      name: 'Gale Crater (Mount Sharp)',
      category: 'Landing Site',
      lat: -4.59,
      lon: 137.44,
      desc: 'Curiosity traverse through ancient lacustrine mudstones and sulfate-bearing layered deposits.',
      elevation: '-4,450 m'
    },
    {
      id: 'olympus',
      name: 'Olympus Mons Caldera',
      category: 'Volcanic Complex',
      lat: 18.65,
      lon: 226.2,
      desc: 'The tallest planetary shield volcano in the solar system, rising 21.9 km above the Martian datum.',
      elevation: '+21,229 m'
    },
    {
      id: 'arcadia',
      name: 'Arcadia Planitia',
      category: 'ISRU Ice Reserve',
      lat: 39.2,
      lon: 189.7,
      desc: 'Extensive shallow radar-mapped subsurface water-ice sheet 1–3 m below surface. Prime human landing zone candidate.',
      elevation: '-3,800 m'
    }
  ];

  const features = [
    {
      title: 'Interactive Mars Layers',
      desc: 'Explore high-resolution Viking MDIM 2.1 mosaics, MOLA relief DEM, checkpoints and scientific targets.',
      to: '/map',
      icon: Layers,
      tag: 'NASA WMTS'
    },
    {
      title: 'Autonomous Route Planner',
      desc: 'A* traversability pathfinding with MOLA slope penalties, rover constraints, and data coverage audits.',
      to: '/planner/route',
      icon: Route,
      tag: 'A* PATHFINDING'
    },
    {
      title: 'Survival Life Support',
      desc: 'Simulate oxygen, water, hydration, food rations, habitat pressure and cosmic radiation margins.',
      to: '/survival',
      icon: ShieldCheck,
      tag: 'BVAD SIMULATION'
    },
    {
      title: 'Martian Field Manual',
      desc: 'Official survival handbook: ISRU water extraction, MOXIE atmospheric O₂, thermal protection, and hazard rules.',
      to: '/manual',
      icon: BookOpen,
      tag: 'EXPEDITION ATLAS'
    },
    {
      title: 'Terrain & Slope Analysis',
      desc: 'Query MOLA 128 ppd elevation, surface slope, and roughness for any coordinate on the Red Planet.',
      to: '/terrain',
      icon: Mountain,
      tag: 'MOLA DEM'
    },
    {
      title: 'Mars Sky Dome & Ephemeris',
      desc: 'View the Martian sky, Allison & McEwen solar position, Phobos, Deimos and Earth morning/evening star.',
      to: '/sky',
      icon: Orbit,
      tag: 'MARS24 ENGINE'
    }
  ];

  return (
    <div className="w-full flex flex-col bg-[#0B0D10] text-[#E7E1D8]">
      {/* Hero Section (Min Height 100svh minus topbar) */}
      <section className="relative w-full min-h-[calc(100svh-64px)] flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden">
        {/* Background Layer */}
        {!imgError ? (
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img
              src={`${import.meta.env.BASE_URL}brand/hero.jpg`}
              alt="Martian surface panoramic landscape with astronaut"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover object-center scale-100 sm:scale-105 motion-safe:animate-[kenburns_40s_ease-in-out_infinite_alternate]"
            />
            {/* Dark gradient overlay matching concept panel 01 */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, rgba(11,13,16,0.92) 0%, rgba(11,13,16,0.72) 40%, rgba(11,13,16,0.25) 75%, transparent 100%), linear-gradient(0deg, #0B0D10 0%, rgba(11,13,16,0.4) 30%, transparent 60%)'
              }}
            />
          </div>
        ) : (
          <div
            className="absolute inset-0 z-0"
            style={{
              background: 'linear-gradient(135deg, #2a120b 0%, #6b2f1a 50%, #0B0D10 100%)'
            }}
          />
        )}

        {/* Hero Content (Left Vertically Centered) */}
        <div className="relative z-10 my-auto max-w-2xl pt-10 sm:pt-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF7043]/15 border border-[#FF7043]/30 text-[#FF7043] text-xs font-mono font-bold tracking-widest uppercase mb-4 sm:mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>EXPEDITION 001</span>
          </div>

          <h1 className="font-display font-bold text-4xl sm:text-6xl lg:text-7xl uppercase tracking-tight text-white leading-tight mb-4 sm:mb-6 drop-shadow-md">
            YOUR LIFE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#E7E1D8] to-[#FFB070]">
              ON MARS
            </span>
          </h1>

          <p className="font-sans text-base sm:text-xl text-[#E7E1D8]/90 font-normal leading-relaxed mb-8 max-w-xl">
            A field guide to surviving, exploring, and building a future on the Red Planet.
            Grounded in direct NASA mission measurements and cartographic datasets.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant="primary"
              size="lg"
              showArrow
              onClick={() => navigate('/planner')}
              className="text-sm sm:text-base font-bold shadow-xl shadow-[#C65D38]/30"
            >
              BEGIN YOUR MISSION
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/map')}
              className="text-sm sm:text-base backdrop-blur-md bg-[#15181D]/40"
            >
              Explore the Map
            </Button>
          </div>
        </div>

        {/* Bottom Hero Strip: 3 Stats (Bottom-Left) & Scroll Cue (Bottom-Right) */}
        <div className="relative z-10 w-full mt-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          {/* 3 Stats Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:max-w-2xl">
            <StatCard
              icon={<Thermometer className="w-4 h-4" />}
              label="Average Temp"
              value={avgTempFormatted}
              statusText="Modeled ground"
              statusLevel="ok"
              provenance="MODELED"
              source="MOLA / MEDA Thermal Engine"
              className="p-3.5"
            />
            <StatCard
              icon={<Wind className="w-4 h-4" />}
              label="Dust Storms"
              value={dustRiskFormatted}
              statusText={`Ls ${skySnapshot.lsDeg.toFixed(0)}° Season`}
              statusLevel="ok"
              provenance="MODELED"
              source="Seasonal Tau Ephemeris"
              className="p-3.5"
            />
            <StatCard
              icon={<Gauge className="w-4 h-4" />}
              label="Atmosphere"
              value="0.6"
              unit="kPa"
              statusText="95% CO₂ (MOXIE ISRU)"
              statusLevel="ok"
              provenance="NASA-DERIVED"
              source="MOLA Datum Standard"
              url="https://mars.nasa.gov/mars2020/spacecraft/instruments/moxie/"
              className="p-3.5"
            />
          </div>

          {/* Bottom-Right Scroll Indicator & Image Credit */}
          <div className="flex flex-col items-end gap-2 text-right">
            <div className="text-[11px] font-mono text-[#A0A0A0]/80">
              Image: NASA / JPL-Caltech / MSSS & Planetary Exploration
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-[#FF7043] animate-bounce">
              <span>SCROLL</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </section>

      {/* Below the Fold: Today on Mars Card */}
      <section className="max-w-[1440px] mx-auto px-6 py-12 w-full">
        <GlassPanel variant="card" className="p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(231,225,216,0.10)] pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#FF7043]">
                  PLANETARY TELEMETRY BROADCAST
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold uppercase text-[#E7E1D8]">
                TODAY ON MARS
              </h2>
            </div>
            <ProvenanceBadge
              type="NASA-DERIVED"
              source="Allison & McEwen (2000) GISS Formulation"
              url="https://www.giss.nasa.gov/tools/mars24/"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#101114]/70 border border-[rgba(231,225,216,0.08)]">
              <span className="text-[11px] font-mono uppercase text-[#A0A0A0]">Mission Sol</span>
              <p className="text-2xl font-mono font-bold text-[#E7E1D8] mt-1">SOL {solNumber}</p>
              <span className="text-xs text-[#A0A0A0]">Mars Year {skySnapshot.marsYear}</span>
            </div>
            <div className="p-4 rounded-xl bg-[#101114]/70 border border-[rgba(231,225,216,0.08)]">
              <span className="text-[11px] font-mono uppercase text-[#A0A0A0]">Solar Longitude (Ls)</span>
              <p className="text-2xl font-mono font-bold text-[#56D9E8] mt-1">{skySnapshot.lsDeg.toFixed(1)}°</p>
              <span className="text-xs text-[#A0A0A0]">{skySnapshot.season}</span>
            </div>
            <div className="p-4 rounded-xl bg-[#101114]/70 border border-[rgba(231,225,216,0.08)]">
              <span className="text-[11px] font-mono uppercase text-[#A0A0A0]">Local True Solar Time</span>
              <p className="text-2xl font-mono font-bold text-[#FFB070] mt-1">{skySnapshot.ltst.substring(0, 5)}</p>
              <span className="text-xs text-[#A0A0A0]">{skySnapshot.isDaylight ? 'Solar Daylight' : 'Night Hours'}</span>
            </div>
            <div className="p-4 rounded-xl bg-[#101114]/70 border border-[rgba(231,225,216,0.08)]">
              <span className="text-[11px] font-mono uppercase text-[#A0A0A0]">Daylight Window</span>
              <p className="text-2xl font-mono font-bold text-[#E7E1D8] mt-1">{skySnapshot.daylightHours.toFixed(1)} h</p>
              <span className="text-xs text-[#A0A0A0]">Sunrise {skySnapshot.sunriseLtst?.substring(0, 5) ?? '--'}</span>
            </div>
          </div>
        </GlassPanel>
      </section>

      {/* Feature Navigation Grid (6 Cards) */}
      <section className="max-w-[1440px] mx-auto px-6 py-8 w-full">
        <div className="mb-8">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#FF7043]">
            SYSTEM ATLAS CAPABILITIES
          </span>
          <h2 className="text-3xl font-display font-bold uppercase text-[#E7E1D8] mt-1">
            EXPLORE THE MARTIAN SUITE
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => navigate(feat.to)}
                className="p-6 rounded-2xl bg-[#15181D]/80 hover:bg-[#1C2027] border border-[rgba(231,225,216,0.10)] hover:border-[#FF7043]/50 text-left transition-all duration-200 cursor-pointer group flex flex-col justify-between hover:-translate-y-1 hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#C65D38]/15 border border-[#FF7043]/30 text-[#FF7043] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#101114] text-[#A0A0A0] border border-[rgba(231,225,216,0.10)]">
                      {feat.tag}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-lg text-[#E7E1D8] group-hover:text-white transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-[#A0A0A0] font-sans mt-2 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-1.5 text-xs font-mono font-semibold text-[#FF7043] group-hover:translate-x-1 transition-transform">
                  <span>LAUNCH MODULE</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured Checkpoints Section */}
      <section className="max-w-[1440px] mx-auto px-6 py-12 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#FF7043]">
              VERIFIED CARTOGRAPHIC SITES
            </span>
            <h2 className="text-3xl font-display font-bold uppercase text-[#E7E1D8] mt-1">
              FEATURED CHECKPOINTS
            </h2>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate('/map')}
            showArrow
            className="text-xs font-mono"
          >
            View all 50+ sites on map
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredCheckpoints.map((cp) => (
            <div
              key={cp.id}
              onClick={() => navigate(`/map?lat=${cp.lat}&lon=${cp.lon}`)}
              className="p-5 rounded-2xl bg-[#15181D]/70 border border-[rgba(231,225,216,0.10)] hover:border-[#56D9E8]/50 hover:bg-[#1C2027]/80 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#56D9E8]/10 text-[#56D9E8] border border-[#56D9E8]/30 font-semibold">
                    {cp.category}
                  </span>
                  <span className="font-mono text-[11px] text-[#A0A0A0]">{cp.elevation}</span>
                </div>
                <h4 className="font-display font-bold text-base text-[#E7E1D8] group-hover:text-white transition-colors">
                  {cp.name}
                </h4>
                <p className="text-xs text-[#A0A0A0] mt-2 font-sans line-clamp-3">
                  {cp.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[rgba(231,225,216,0.06)] flex items-center justify-between text-xs font-mono text-[#56D9E8]">
                <span>{cp.lat}°N, {cp.lon}°E</span>
                <Compass className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};
