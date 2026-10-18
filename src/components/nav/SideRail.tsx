import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RAIL_ITEMS } from './navConfig';
import { getNavIcon } from './NavDropdown';

interface SideRailProps {
  className?: string;
}

export const SideRail: React.FC<SideRailProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;

  return (
    <aside
      className={`hidden md:flex flex-col items-center justify-between py-5 w-16 bg-[#0B0D10] border-r border-[rgba(231,225,216,0.10)] shrink-0 z-30 select-none ${className}`}
      aria-label="Quick Access Rail"
    >
      <div className="flex flex-col items-center gap-4 w-full px-2">
        {RAIL_ITEMS.map((item) => {
          const Icon = getNavIcon(item.icon);
          const isActive =
            item.to === '/'
              ? currentPath === '/' || currentPath === ''
              : currentPath === item.to || currentPath.startsWith(item.to + '/');

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.to)}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                isActive
                  ? 'bg-[#C65D38] text-white shadow-lg shadow-[#C65D38]/40 border border-[#FF7043]/50 glow-orange'
                  : 'bg-[#15181D]/80 text-[#A0A0A0] hover:text-[#E7E1D8] hover:bg-[#1C2027] border border-[rgba(231,225,216,0.08)] hover:border-[rgba(231,225,216,0.20)]'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              <Icon className="w-5 h-5" />

              {/* Tooltip on hover */}
              <span className="absolute left-full ml-3 px-2.5 py-1 rounded-md bg-[#1C2027] text-white text-xs font-display whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity border border-[rgba(231,225,216,0.15)] shadow-xl z-50">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom marker / version icon */}
      <div className="w-full flex flex-col items-center gap-2">
        <span
          className="w-2 h-2 rounded-full bg-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.7)]"
          title="Telemetry Online • 2026 Space Apps"
        />
        <span className="text-[9px] font-mono text-[#6B6F76]">v1.0</span>
      </div>
    </aside>
  );
};
