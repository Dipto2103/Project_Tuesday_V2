import React, { useState } from 'react';
import { SkyPanel } from '../components/sky/SkyPanel';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';

export const SkyPage: React.FC = () => {
  const [observerLat, setObserverLat] = useState(18.4447);
  const [observerLonE, setObserverLonE] = useState(77.4508);
  const [observerName, setObserverName] = useState('Jezero Crater (Perseverance Site)');

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0D10] text-[#E7E1D8] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-12 border-b border-[rgba(231,225,216,0.10)] bg-[#101114] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-xs font-display">
          <span className="font-bold uppercase tracking-wider text-white">MARS SKY DOME</span>
          <span className="text-[#6B6F76]">•</span>
          <span className="text-[#FFB070] font-semibold">Ephemeris, Sun, Stars & Moons</span>
        </div>
        <ProvenanceBadge type="NASA-DERIVED" source="Allison & McEwen (2000) GISS" showIcon={false} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-[1440px] mx-auto w-full">
        <SkyPanel
          observerLat={observerLat}
          observerLonE={observerLonE}
          observerName={observerName}
        />
      </div>
    </div>
  );
};
