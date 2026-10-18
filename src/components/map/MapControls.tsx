import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Minus, RotateCcw, Search, Crosshair, Filter, Check } from 'lucide-react';
import type { MarsCoordinate } from '../../types/route';
import type { Checkpoint } from '../../core/types';
import { searchLocations, type SearchResult } from '../../core/search';
import { lon360ToDisplay } from '../../core/geo';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onNavigateCoordinates: (coord: MarsCoordinate) => void;
  onSelectCoordinate?: (coord: MarsCoordinate) => void;
  checkpoints?: Checkpoint[];
  activeCategories?: string[];
  onToggleCategory?: (category: string) => void;
}

const CATEGORIES = [
  { id: 'landing_site', label: 'Landers', icon: '🚀', color: 'text-emerald-400' },
  { id: 'mineral', label: 'Minerals', icon: '💎', color: 'text-purple-400' },
  { id: 'water_ice', label: 'Water-Ice', icon: '❄', color: 'text-cyan-400' },
  { id: 'hazard', label: 'Hazards', icon: '▲', color: 'text-rose-400' },
  { id: 'landmark', label: 'Landmarks', icon: '◆', color: 'text-amber-400' }
];

export const MapControls: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetView,
  onNavigateCoordinates,
  onSelectCoordinate,
  checkpoints = [],
  activeCategories = [],
  onToggleCategory
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchInput.trim() || searchInput.trim().length < 2) return [];
    return searchLocations(searchInput, checkpoints, 6);
  }, [searchInput, checkpoints]);

  const handleSelectResult = (res: SearchResult) => {
    const displayLon = lon360ToDisplay(res.lonE);
    const coord: MarsCoordinate = {
      latitude: res.lat,
      longitude: res.lonE
    };

    onNavigateCoordinates({ latitude: res.lat, longitude: displayLon });
    if (onSelectCoordinate) {
      onSelectCoordinate(coord);
    }

    setSearchInput(res.title);
    setIsDropdownOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSelectResult(searchResults[0]);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute top-4 left-4 z-[400] flex flex-col gap-2 select-none"
    >
      {/* Search Input & Filter Toggle Bar */}
      <div className="flex items-center gap-1.5">
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center bg-mars-dark/95 backdrop-blur-md border border-mars-border rounded-lg shadow-2xl overflow-hidden w-72 focus-within:border-mars-orange/60 transition-colors"
        >
          <div className="pl-3 text-mars-muted">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => {
              if (searchInput.trim().length >= 2) setIsDropdownOpen(true);
            }}
            placeholder="Search place, ice, mineral, coords..."
            className="w-full bg-transparent text-xs font-mono text-mars-text px-2.5 py-2 focus:outline-none placeholder:text-mars-muted/50"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setIsDropdownOpen(false);
              }}
              className="px-2 text-mars-muted hover:text-white text-xs font-mono"
            >
              ×
            </button>
          )}
          <button
            type="submit"
            className="px-2.5 py-2 bg-mars-surface hover:bg-mars-border text-mars-orange text-xs font-mono transition-colors border-l border-mars-border"
            title="Search and navigate"
          >
            Go
          </button>
        </form>

        {/* Filter Toggle Button */}
        {onToggleCategory && (
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border backdrop-blur-md transition-colors shadow-xl ${
              showFilters || (activeCategories && activeCategories.length > 0)
                ? 'bg-mars-orange/20 border-mars-orange text-mars-orange'
                : 'bg-mars-dark/90 border-mars-border text-mars-text hover:bg-mars-surface'
            }`}
            title="Toggle category filter chips"
          >
            <Filter className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Search Dropdown */}
      {isDropdownOpen && searchResults.length > 0 && (
        <div className="bg-mars-dark/95 backdrop-blur-md border border-mars-border rounded-lg shadow-2xl overflow-hidden w-72 flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100">
          {searchResults.map((res, i) => (
            <button
              key={`${res.title}-${i}`}
              type="button"
              onClick={() => handleSelectResult(res)}
              className="flex flex-col text-left px-3 py-1.5 hover:bg-mars-surface/80 border-b border-mars-border/30 last:border-b-0 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-sans font-bold text-xs text-white truncate">
                  {res.type === 'coordinate' ? '✦ ' : ''}
                  {res.title}
                </span>
                <span className="text-[10px] font-mono text-mars-orange font-semibold">
                  {res.lat >= 0 ? `${res.lat.toFixed(1)}°N` : `${Math.abs(res.lat).toFixed(1)}°S`}
                </span>
              </div>
              <span className="text-[10px] font-mono text-mars-muted truncate">
                {res.subtitle}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Category Filter Chips Toolbar */}
      {showFilters && onToggleCategory && (
        <div className="flex flex-wrap gap-1 bg-mars-dark/90 backdrop-blur-md p-2 rounded-lg border border-mars-border shadow-xl max-w-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="text-[10px] font-mono text-slate-400 w-full mb-1 flex items-center justify-between">
            <span>FILTER CHECKPOINTS:</span>
            {activeCategories.length > 0 && (
              <span className="text-mars-orange">{activeCategories.length} active</span>
            )}
          </div>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategories.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onToggleCategory(cat.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition-colors border ${
                  isActive
                    ? 'bg-mars-surface border-mars-orange text-white shadow'
                    : 'bg-mars-darkest/60 border-mars-border/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span className={isActive ? cat.color : ''}>{cat.label}</span>
                {isActive && <Check className="w-3 h-3 text-mars-orange ml-0.5" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="flex flex-col bg-mars-dark/90 backdrop-blur border border-mars-border rounded-lg shadow-xl overflow-hidden w-9">
        <button
          onClick={onZoomIn}
          className="p-2 text-mars-text hover:bg-mars-surface hover:text-mars-orange transition-colors flex items-center justify-center border-b border-mars-border"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={onZoomOut}
          className="p-2 text-mars-text hover:bg-mars-surface hover:text-mars-orange transition-colors flex items-center justify-center border-b border-mars-border"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={onResetView}
          className="p-2 text-mars-text hover:bg-mars-surface hover:text-mars-cyan transition-colors flex items-center justify-center"
          title="Reset to Jezero Crater"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
