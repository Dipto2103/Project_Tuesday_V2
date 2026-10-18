import React, { useState } from 'react';
import { SatellitePanel } from '../components/satellite/SatellitePanel';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';

export const SatellitePage: React.FC = () => {
  const [targetLat, setTargetLat] = useState(18.44);
  const [targetLon, setTargetLon] = useState(77.45);
  const [targetName, setTargetName] = useState('Jezero Crater (Perseverance Landing Site)');

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0D10] text-[#E7E1D8] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-12 border-b border-[rgba(231,225,216,0.10)] bg-[#101114] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-xs font-display">
          <span className="font-bold uppercase tracking-wider text-white">SATELLITE VIEW</span>
          <span className="text-[#6B6F76]">•</span>
          <span className="text-[#56D9E8] font-semibold">NASA Orbital Reconnaissance & HiRISE Imagery</span>
        </div>
        <ProvenanceBadge type="NASA-DERIVED" source="NASA Trek / HiRISE" showIcon={false} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-[1440px] mx-auto w-full">
        <SatellitePanel
          targetLat={targetLat}
          targetLon={targetLon}
          targetName={targetName}
        />
      </div>
    </div>
  );
};
