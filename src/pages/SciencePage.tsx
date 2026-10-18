import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Search,
  MapPin,
  ExternalLink,
  Sparkles,
  Layers,
  ChevronRight,
  Compass
} from 'lucide-react';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';
import { Chip } from '../components/ui/Chip';
import { Button } from '../components/ui/Button';
import { SCIENCE_CATALOG } from '../data/scienceCatalog';

export const SciencePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMineral, setSelectedMineral] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const mineralFilters = [
    { id: 'all', label: 'All Targets' },
    { id: 'clay', label: 'Clays & Smectites', color: '#F5B544' },
    { id: 'carbonate', label: 'Carbonates', color: '#4ADE80' },
    { id: 'sulfate', label: 'Sulfates', color: '#B392F0' },
    { id: 'ice', label: 'Subsurface Water-Ice (SWIM)', color: '#56D9E8' }
  ];

  const filteredObservations = useMemo(() => {
    return SCIENCE_CATALOG.filter((obs) => {
      const q = searchQuery.toLowerCase();
      const minerals = obs.keyMineralsOrFeatures || [];
      const matchesSearch =
        !q ||
        obs.name.toLowerCase().includes(q) ||
        obs.description.toLowerCase().includes(q) ||
        obs.scientificRelevance.toLowerCase().includes(q) ||
        minerals.some((m) => m.toLowerCase().includes(q));

      let matchesMineral = true;
      if (selectedMineral === 'clay') {
        matchesMineral = minerals.some(
          (m) => m.toLowerCase().includes('clay') || m.toLowerCase().includes('smectite')
        );
      } else if (selectedMineral === 'carbonate') {
        matchesMineral = minerals.some((m) => m.toLowerCase().includes('carbonate'));
      } else if (selectedMineral === 'sulfate') {
        matchesMineral = minerals.some((m) => m.toLowerCase().includes('sulfate'));
      } else if (selectedMineral === 'ice') {
        matchesMineral = obs.name.toLowerCase().includes('ice') || obs.description.toLowerCase().includes('ice');
      }

      return matchesSearch && matchesMineral;
    });
  }, [searchQuery, selectedMineral]);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8 text-[#E7E1D8]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(231,225,216,0.10)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-5 h-5 text-[#4ADE80]" />
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#4ADE80]">
              ASTROBIOLOGY & ISRU CATALOG
            </span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase text-white">
            SCIENCE TARGETS & MINERALOGY
          </h1>
          <p className="font-sans text-sm text-[#A0A0A0] mt-1">
            CRISM spectral detections, clay/carbonate biosignature zones, and SWIM subsurface water-ice mapping
          </p>
        </div>

        <ProvenanceBadge type="NASA-DERIVED" source="MRO CRISM & Mars 2020 SuperCam" showIcon={false} />
      </div>

      {/* SWIM Ice Likelihood Scientific Notice */}
      <div className="p-4 rounded-2xl bg-[#56D9E8]/10 border border-[#56D9E8]/30 flex items-start gap-3 text-xs font-sans text-[#E7E1D8]">
        <span className="w-2 h-2 rounded-full bg-[#56D9E8] mt-1.5 shrink-0 animate-pulse" />
        <p className="leading-relaxed">
          <strong className="text-[#56D9E8] font-mono uppercase">SCIENTIFIC DIRECTIVE ON WATER-ICE:</strong> NASA Subsurface Water Ice Mapping (SWIM) radar data represents shallow ice <em>likelihood</em> and dielectric consistency, not physical core proof outside direct lander robotic excavations (such as Phoenix trenching at Green Valley).
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Mineral Chips */}
        <div className="flex flex-wrap gap-2">
          {mineralFilters.map((m) => (
            <Chip
              key={m.id}
              label={m.label}
              color={m.color}
              selected={selectedMineral === m.id}
              onToggle={() => setSelectedMineral(m.id)}
            />
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.12)] w-full sm:w-64">
          <Search className="w-4 h-4 text-[#A0A0A0] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search minerals, sites..."
            className="w-full bg-transparent text-xs text-[#E7E1D8] placeholder-[#6B6F76] focus:outline-none"
          />
        </div>
      </div>

      {/* Science Observations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredObservations.map((obs) => (
          <div
            key={obs.id}
            className="p-6 rounded-2xl bg-[#15181D]/80 border border-[rgba(231,225,216,0.10)] hover:border-[#4ADE80]/40 transition-all flex flex-col justify-between hover:shadow-xl group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30 font-semibold uppercase">
                  {obs.category.replace('_', ' ')}
                </span>
                <ProvenanceBadge type="NASA-DERIVED" source={obs.mission} showIcon={false} />
              </div>

              <h3 className="font-display font-bold text-base text-[#E7E1D8] group-hover:text-white transition-colors">
                {obs.name}
              </h3>

              <div className="flex items-center gap-2 text-xs font-mono text-[#56D9E8] my-2">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{obs.coordinates.latitude.toFixed(2)}°N, {obs.coordinates.longitude.toFixed(2)}°E</span>
                <span>•</span>
                <span>{obs.elevationMeters} m</span>
              </div>

              <p className="text-xs text-[#A0A0A0] font-sans leading-relaxed mt-2">
                {obs.scientificRelevance}
              </p>

              {/* Key Minerals */}
              <div className="mt-4 pt-3 border-t border-[rgba(231,225,216,0.06)]">
                <span className="text-[10px] font-mono uppercase text-[#A0A0A0] block mb-1.5 font-bold">
                  SPECTRAL DETECTIONS
                </span>
                <div className="flex flex-wrap gap-1">
                  {(obs.keyMineralsOrFeatures || []).map((min, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#101114] text-[#E7E1D8] border border-[rgba(231,225,216,0.08)]"
                    >
                      {min}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[rgba(231,225,216,0.08)] flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#A0A0A0]">
                {obs.instrument}
              </span>
              <button
                type="button"
                onClick={() => navigate(`/map?lat=${obs.coordinates.latitude}&lon=${obs.coordinates.longitude}`)}
                className="inline-flex items-center gap-1 text-xs font-mono text-[#FF7043] hover:underline cursor-pointer"
              >
                <span>View on Map</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
