import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Compass, ExternalLink, X, Crosshair } from 'lucide-react';
import { searchLocations, parseCoordinateInput, SearchResult } from '../../core/search';
import type { Checkpoint } from '../../core/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  checkpoints?: Checkpoint[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  checkpoints = []
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const searchRes = searchLocations(query, checkpoints, 8);
    setResults(searchRes);
  }, [query, checkpoints]);

  const handleSelect = (item: SearchResult) => {
    onClose();
    navigate(`/map?lat=${item.lat}&lon=${item.lonE}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-sm select-none">
      <div
        className="w-full max-w-xl rounded-2xl bg-[#101114]/95 border border-[rgba(231,225,216,0.18)] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[rgba(231,225,216,0.10)] bg-[#15181D]/60">
          <Search className="w-5 h-5 text-[#FF7043] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search landmarks, landing sites, or enter coordinates (e.g. 18.44°N 77.45°E)..."
            className="flex-1 bg-transparent text-[#E7E1D8] placeholder-[#A0A0A0] text-sm font-sans focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#A0A0A0] hover:text-[#E7E1D8] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length > 0 ? (
            results.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#1C2027] text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#FF7043]/15 text-[#FF7043] flex items-center justify-center shrink-0">
                    {item.type === 'coordinate' ? (
                      <Crosshair className="w-4 h-4" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-sm text-[#E7E1D8] group-hover:text-white truncate">
                      {item.title}
                    </p>
                    <p className="font-mono text-xs text-[#A0A0A0] truncate">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-[#56D9E8] shrink-0 ml-2">
                  {item.lat.toFixed(2)}°, {item.lonE.toFixed(2)}°E
                </span>
              </button>
            ))
          ) : query.trim() ? (
            <div className="p-8 text-center text-sm font-mono text-[#A0A0A0]">
              No checkpoints or matching coordinates found for "{query}"
            </div>
          ) : (
            <div className="p-6 text-center text-xs font-mono text-[#6B6F76]">
              Type a site name, mineral, mission, or coordinate pair to navigate the Martian surface
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-[rgba(231,225,216,0.08)] bg-[#0B0D10] text-[10px] font-mono text-[#6B6F76] flex items-center justify-between">
          <span>Esc to close • Enter to navigate</span>
          <span>MARS LANTERN GEOCODER</span>
        </div>
      </div>
    </div>
  );
};
