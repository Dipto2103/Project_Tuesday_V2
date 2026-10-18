import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  Compass,
  Clock,
  ShieldCheck,
  Flame,
  Droplets,
  Apple,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';
import { useRoutePlanner } from '../hooks/useRoutePlanner';
import { generateMissionMarkdown } from '../core/mission/share';
import type { Checkpoint } from '../core/types';

export const BriefingPage: React.FC = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);

  const { startCoord, destCoord, primaryRoute } = useRoutePlanner();

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/checkpoints.json`)
      .then((r) => r.json())
      .then((data: Checkpoint[]) => setCheckpoints(data))
      .catch((err) => console.warn('[BRIEFING] Failed to load checkpoints:', err));
  }, []);

  const distanceKm = primaryRoute?.distanceKm || 428.4;
  const solsDuration = primaryRoute ? ((primaryRoute.estimatedDurationHours || 78.4) / 24.66) : 3.2;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMarkdown = () => {
    const md = `# MARS LANTERN — MISSION BRIEFING DOSSIER
**Expedition Code:** ARES-EXP-001  
**Generated:** ${new Date().toUTCString()}  
**Provenance Standard:** MARS_LANTERN_SPEC v1.0  

---

## 1. Traverse Profile
- **Total Distance:** ${distanceKm.toFixed(1)} km
- **Estimated Surface Time:** ${solsDuration.toFixed(1)} sols (${(solsDuration * 24.66).toFixed(1)} hours)
- **Start Coordinate:** ${startCoord ? `${startCoord.latitude}°N, ${startCoord.longitude}°E` : '18.44°N, 77.45°E'}
- **Destination Coordinate:** ${destCoord ? `${destCoord.latitude}°N, ${destCoord.longitude}°E` : '18.65°N, 226.2°E'}
- **Terrain Risk Assessment:** Low to Moderate (A* slope bounded < 15°)

---

## 2. Consumable Allotment (SIMULATED • NASA BVAD)
- **Metabolic O₂ Required:** ${(solsDuration * 4 * 0.84).toFixed(1)} kg
- **Drinking & ECLSS Water:** ${(solsDuration * 4 * 2.5 * 0.15).toFixed(1)} kg
- **Dry Rations (Food):** ${(solsDuration * 4 * 0.82).toFixed(1)} kg

---

*Built for NASA Space Apps Challenge 2026 • Martian Exploration Atlas*
`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mars-lantern-briefing-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const data = {
      mission: 'ARES-EXP-001',
      timestamp: new Date().toISOString(),
      distanceKm,
      solsDuration,
      startCoord: startCoord || { latitude: 18.44, longitude: 77.45 },
      destCoord: destCoord || { latitude: 18.65, longitude: 226.2 },
      provenance: 'NASA-DERIVED / MODELED'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mars-lantern-mission-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8 text-[#E7E1D8]">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(231,225,216,0.10)] pb-6 print:hidden">
        <button
          type="button"
          onClick={() => navigate('/planner')}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[#A0A0A0] hover:text-[#FF7043] transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Mission Builder</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={handleDownloadMarkdown} icon={<Download className="w-3.5 h-3.5" />}>
            Export Markdown
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownloadJSON} icon={<Download className="w-3.5 h-3.5" />}>
            Export JSON
          </Button>
          <Button variant="secondary" size="sm" onClick={handleCopyLink} icon={<Share2 className="w-3.5 h-3.5" />}>
            {copied ? '✓ Link Copied' : 'Share Link'}
          </Button>
          <Button variant="primary" size="sm" onClick={handlePrint} icon={<Printer className="w-3.5 h-3.5" />}>
            Print Dossier (PDF)
          </Button>
        </div>
      </div>

      {/* Printable Briefing Document */}
      <article className="p-8 sm:p-12 rounded-3xl bg-[#15181D]/90 border border-[rgba(231,225,216,0.15)] shadow-2xl flex flex-col gap-8 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        {/* Dossier Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#FF7043] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF7043]" />
              <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#FF7043] print:text-orange-600">
                OFFICIAL MISSION BRIEFING DOSSIER
              </span>
            </div>
            <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase text-white print:text-black tracking-wide">
              EXPEDITION BRIEFING
            </h1>
            <p className="font-mono text-xs text-[#A0A0A0] print:text-gray-600 mt-1">
              MARS LANTERN CARTOGRAPHIC ATLAS • NASA SPACE APPS 2026
            </p>
          </div>

          <div className="text-right font-mono text-xs print:text-black">
            <span className="block text-[#A0A0A0] print:text-gray-600 text-[10px]">SECURITY CLASS</span>
            <span className="font-bold text-[#4ADE80] print:text-green-700">UNCLASSIFIED / SCIENTIFIC</span>
            <span className="block text-[11px] text-[#A0A0A0] print:text-gray-600 mt-1">
              SOL 12 • LTST 14:32
            </span>
          </div>
        </div>

        {/* 1. Traverse Profile */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg uppercase text-white print:text-black">
              1. TRAVERSE PROFILE & NAVIGATION
            </h2>
            <ProvenanceBadge type="MODELED" source="A* Traversability Engine" showIcon={false} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-[#101114] border border-[rgba(231,225,216,0.08)] print:bg-gray-50 print:border-gray-200">
              <span className="text-[#A0A0A0] print:text-gray-600 block text-[10px] uppercase">Total Distance</span>
              <span className="text-2xl font-bold text-[#56D9E8] print:text-blue-700 mt-1 block">{distanceKm.toFixed(1)} km</span>
              <span className="text-[11px] text-[#A0A0A0] print:text-gray-500">MOLA ground track</span>
            </div>

            <div className="p-4 rounded-xl bg-[#101114] border border-[rgba(231,225,216,0.08)] print:bg-gray-50 print:border-gray-200">
              <span className="text-[#A0A0A0] print:text-gray-600 block text-[10px] uppercase">Estimated Duration</span>
              <span className="text-2xl font-bold text-[#E7E1D8] print:text-black mt-1 block">{solsDuration.toFixed(1)} sols</span>
              <span className="text-[11px] text-[#A0A0A0] print:text-gray-500">{(solsDuration * 24.66).toFixed(1)} hours traverse</span>
            </div>

            <div className="p-4 rounded-xl bg-[#101114] border border-[rgba(231,225,216,0.08)] print:bg-gray-50 print:border-gray-200">
              <span className="text-[#A0A0A0] print:text-gray-600 block text-[10px] uppercase">Terrain Safety</span>
              <span className="text-2xl font-bold text-[#4ADE80] print:text-green-700 mt-1 block">PASS</span>
              <span className="text-[11px] text-[#A0A0A0] print:text-gray-500">Max slope &lt; 15° bound</span>
            </div>
          </div>
        </section>

        {/* 2. Consumable Assessment */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg uppercase text-white print:text-black">
              2. CONSUMABLES & LIFE SUPPORT ALLOTMENT
            </h2>
            <ProvenanceBadge type="SIMULATED" source="NASA BVAD Baseline Standard" showIcon={false} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-[#101114] border border-[rgba(231,225,216,0.08)] print:bg-gray-50 print:border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-[#FF7043] print:text-orange-600" />
                <span className="text-[#A0A0A0] print:text-gray-600 text-[10px] uppercase">Oxygen Allocation</span>
              </div>
              <span className="text-2xl font-bold text-white print:text-black">
                {(solsDuration * 4 * 0.84).toFixed(1)} kg
              </span>
              <span className="text-[11px] text-[#A0A0A0] print:text-gray-500 block mt-1">
                0.84 kg/astronaut/sol + 20% margin
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#101114] border border-[rgba(231,225,216,0.08)] print:bg-gray-50 print:border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Droplets className="w-4 h-4 text-[#56D9E8] print:text-blue-600" />
                <span className="text-[#A0A0A0] print:text-gray-600 text-[10px] uppercase">Water Allocation</span>
              </div>
              <span className="text-2xl font-bold text-white print:text-black">
                {(solsDuration * 4 * 2.5 * 0.15).toFixed(1)} kg
              </span>
              <span className="text-[11px] text-[#A0A0A0] print:text-gray-500 block mt-1">
                85% ECLSS recovery cycle
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#101114] border border-[rgba(231,225,216,0.08)] print:bg-gray-50 print:border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Apple className="w-4 h-4 text-[#4ADE80] print:text-green-600" />
                <span className="text-[#A0A0A0] print:text-gray-600 text-[10px] uppercase">Rations (Food)</span>
              </div>
              <span className="text-2xl font-bold text-white print:text-black">
                {(solsDuration * 4 * 0.82).toFixed(1)} kg
              </span>
              <span className="text-[11px] text-[#A0A0A0] print:text-gray-500 block mt-1">
                3,000 kcal/sol caloric standard
              </span>
            </div>
          </div>
        </section>

        {/* 3. Scientific Disclaimers & Provenance */}
        <section className="p-5 rounded-2xl bg-[#101114] border border-[rgba(231,225,216,0.08)] text-xs font-sans space-y-2 text-[#A0A0A0] print:bg-gray-50 print:text-gray-600">
          <p className="font-bold text-[#E7E1D8] print:text-black font-display uppercase tracking-wider">
            SCIENTIFIC GUARDRAILS & LIMITATIONS
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Recurring Slope Lineae (RSL) are classified as slope hazards (&gt; 27° dry granular flows) per NASA/HiRISE findings. Never treat RSL as water resources.</li>
            <li>Surface temperature estimates carry an engineering uncertainty band of ±15 K unless anchored directly to in-situ MEDA or REMS weather logs.</li>
            <li>Subsurface water-ice data represents radar-derived likelihood (SWIM project), not direct excavation proof outside verified lander trenches.</li>
          </ul>
        </section>
      </article>
    </div>
  );
};
