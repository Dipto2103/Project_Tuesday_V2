import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Clock, X, Info } from 'lucide-react';
import { calculateMarsSky, MarsSkySnapshot } from '../../core/sky/mars24';
import { ProvenanceBadge } from '../ui/ProvenanceBadge';

interface MissionClockChipProps {
  lat?: number;
  lonE?: number;
  siteName?: string;
  className?: string;
}

export const MissionClockChip: React.FC<MissionClockChipProps> = ({
  lat = 18.4447,
  lonE = 77.4508,
  siteName = 'Jezero Crater',
  className = ''
}) => {
  const [snapshot, setSnapshot] = useState<MarsSkySnapshot>(() =>
    calculateMarsSky(new Date(), lat, lonE)
  );
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      setSnapshot(calculateMarsSky(new Date(), lat, lonE));
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [lat, lonE]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const solNumber = Math.floor(snapshot.msd % 1000);
  const ltstTime = snapshot.ltst.substring(0, 5); // HH:MM

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#15181D]/90 hover:bg-[#1C2027] border border-[rgba(231,225,216,0.12)] hover:border-[#FF7043]/40 transition-all cursor-pointer select-none group"
        aria-label="Mission Clock Telemetry"
      >
        <div className="w-5 h-5 rounded-full bg-[#FF7043]/15 flex items-center justify-center text-[#FF7043] group-hover:scale-110 transition-transform shrink-0">
          {snapshot.isDaylight ? (
            <Sun className="w-3.5 h-3.5 text-[#FF7043] animate-spin-slow" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-[#56D9E8]" />
          )}
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="font-bold text-[#E7E1D8]">SOL {solNumber}</span>
          <span className="text-[#6B6F76]">•</span>
          <span className="text-[#FFB070] font-medium">{ltstTime} LTST</span>
        </div>
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#101114]/95 backdrop-blur-xl border border-[rgba(231,225,216,0.15)] shadow-2xl p-4 z-50 text-xs font-sans">
          <div className="flex items-center justify-between border-b border-[rgba(231,225,216,0.10)] pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FF7043]" />
              <span className="font-display font-bold uppercase tracking-wider text-[#E7E1D8]">
                Mars Solar Telemetry
              </span>
            </div>
            <ProvenanceBadge type="MODELED" source="Allison & McEwen 2000" showIcon={false} />
          </div>

          <div className="space-y-2 text-[#E7E1D8]">
            <div className="flex justify-between py-1 border-b border-[rgba(231,225,216,0.06)]">
              <span className="text-[#A0A0A0]">Site Location:</span>
              <span className="font-mono text-right">{siteName} ({lat.toFixed(2)}°N, {lonE.toFixed(2)}°E)</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[rgba(231,225,216,0.06)]">
              <span className="text-[#A0A0A0]">Mars Year / Sol:</span>
              <span className="font-mono font-semibold">MY {snapshot.marsYear} • Sol {solNumber}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[rgba(231,225,216,0.06)]">
              <span className="text-[#A0A0A0]">Solar Longitude (Ls):</span>
              <span className="font-mono font-semibold text-[#56D9E8]">{snapshot.lsDeg.toFixed(1)}°</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[rgba(231,225,216,0.06)]">
              <span className="text-[#A0A0A0]">Martian Season:</span>
              <span className="text-right text-[#FFB070]">{snapshot.season}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[rgba(231,225,216,0.06)]">
              <span className="text-[#A0A0A0]">Sunrise / Sunset:</span>
              <span className="font-mono">
                {snapshot.sunriseLtst ? snapshot.sunriseLtst.substring(0, 5) : '--'} / {snapshot.sunsetLtst ? snapshot.sunsetLtst.substring(0, 5) : '--'} LTST
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-[#A0A0A0]">Sun Elevation:</span>
              <span className="font-mono">{snapshot.sunElevationDeg.toFixed(1)}° ({snapshot.isDaylight ? 'Daylight' : 'Night'})</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[rgba(231,225,216,0.08)] text-[10px] text-[#A0A0A0] flex items-center justify-between">
            <span>NASA GISS Mars24 Algorithm</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#FF7043] hover:underline cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
