import React, { useState } from 'react';
import { BookOpen, Database, ShieldAlert, Cpu, ExternalLink } from 'lucide-react';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';
import { NASA_DATA_SOURCES } from '../services/sourceRegistry';
import { Footer } from '../components/layout/Footer';

export const AboutPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'algorithms' | 'limitations'>('overview');

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8 text-[#E7E1D8]">
      {/* Header */}
      <div className="border-b border-[rgba(231,225,216,0.10)] pb-6">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-[#FF7043]" />
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#FF7043]">
            NASA SPACE APPS CHALLENGE 2026
          </span>
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase text-white">
          DATA & SCIENTIFIC PROVENANCE
        </h1>
        <p className="font-sans text-sm text-[#A0A0A0] mt-1">
          Complete attribution, cartographic registries, and physical models governing MARS LANTERN
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[rgba(231,225,216,0.12)] gap-6 text-xs font-mono">
        {(['overview', 'sources', 'algorithms', 'limitations'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 border-b-2 uppercase tracking-wider font-semibold transition-colors cursor-pointer ${
              activeTab === tab
                ? 'border-[#FF7043] text-white font-bold'
                : 'border-transparent text-[#A0A0A0] hover:text-[#E7E1D8]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-4 font-sans text-sm leading-relaxed text-[#E7E1D8]/90">
            <h2 className="text-xl font-display font-bold text-white uppercase">
              MARS LANTERN — Mission Philosophy
            </h2>
            <p>
              MARS LANTERN is an offline-capable, scientifically rigorous Martian exploration atlas and survival decision-support system built for future astronaut crews, mission controllers, and planetary scientists.
            </p>
            <p>
              Rather than generic speculative sci-fi, every coordinate, elevation profile, temperature curve, and life-support calculation is grounded directly in verified NASA, ESA, and USGS planetary datasets.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)]">
                <span className="font-display font-bold text-sm text-white block mb-1">
                  Provenance Badging Standard
                </span>
                <p className="text-xs text-[#A0A0A0]">
                  Every telemetry readout displays its origin: MEASURED, NASA-DERIVED, MODELED, SIMULATED, or UNKNOWN. Unknown terrain is never classified as "safe".
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)]">
                <span className="font-display font-bold text-sm text-white block mb-1">
                  Offline-First Architecture
                </span>
                <p className="text-xs text-[#A0A0A0]">
                  Local bundled DEMs, cached tile sets, and pre-compiled checkpoint catalogs allow the entire atlas to operate reliably in simulated Martian isolation with zero Earth network connectivity.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="space-y-4">
            <h2 className="text-xl font-display font-bold text-white uppercase">
              Official NASA / Planetary Data System Registries
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(NASA_DATA_SOURCES).map((src) => (
                <div
                  key={src.id}
                  className="p-4 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-display font-bold text-sm text-white">{src.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-[#56D9E8]">
                        {src.datasetType}
                      </span>
                    </div>
                    <p className="text-xs text-[#A0A0A0] leading-relaxed mb-3">
                      {src.attribution}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t border-[rgba(231,225,216,0.06)]">
                    <span className="text-[#6B6F76]">{src.provider}</span>
                    <a
                      href={src.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#FF7043] hover:underline"
                    >
                      <span>NASA Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'algorithms' && (
          <div className="space-y-4 font-sans text-sm leading-relaxed text-[#E7E1D8]/90">
            <h2 className="text-xl font-display font-bold text-white uppercase">
              Core Physical & Ephemeris Models
            </h2>
            <div className="space-y-3 font-mono text-xs">
              <div className="p-4 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)]">
                <span className="font-bold text-[#FF7043] block mb-1">Mars24 Ephemeris Formulation</span>
                <p className="text-xs text-[#A0A0A0] font-sans">
                  Allison, M., and M. McEwen 2000. "A Post-Pathfinder Evaluation of Areocentric Solar Coordinates with Improved Timing Recipes for Mars Seasonal/Diurnal Climate Studies." Planet. Space Sci., 48, 215-235.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)]">
                <span className="font-bold text-[#56D9E8] block mb-1">MOLA Altimetry & Grid DEM</span>
                <p className="text-xs text-[#A0A0A0] font-sans">
                  Smith et al. 2001. "Mars Orbiter Laser Altimeter: Experiment overview and selected results from the primary mission." Journal of Geophysical Research: Planets, 106(E10), 23689-23722.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.08)]">
                <span className="font-bold text-[#4ADE80] block mb-1">NASA Baseline Values for Exploration (BVAD)</span>
                <p className="text-xs text-[#A0A0A0] font-sans">
                  NASA/TP-2015-218570. Life support metabolic consumable rates, oxygen inhalation, water recycling, and EVA duration constraints.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'limitations' && (
          <div className="space-y-4 font-sans text-sm leading-relaxed text-[#E7E1D8]/90">
            <h2 className="text-xl font-display font-bold text-white uppercase">
              Scientific Guardrails & Limitations
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-xs font-mono text-[#A0A0A0]">
              <li>
                <strong className="text-white">Recurring Slope Lineae (RSL):</strong> Occur exclusively on slopes &gt; 27° and match the angle of repose for dry granular flows (USGS/HiRISE). Never classified as water resources.
              </li>
              <li>
                <strong className="text-white">Surface Temperature:</strong> MOLA/MEDA models are engineering estimates with a ±15 K uncertainty band, labeled MODELED unless anchored to in-situ sensor logs.
              </li>
              <li>
                <strong className="text-white">SWIM Subsurface Ice:</strong> Represents radar dielectric likelihood and neutron absorption, not direct proof of pure potable ice deposits.
              </li>
            </ul>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};
