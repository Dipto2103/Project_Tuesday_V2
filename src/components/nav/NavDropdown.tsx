import React, { useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Layers,
  Satellite,
  Orbit,
  Route,
  ClipboardList,
  GitCompare,
  FileText,
  Compass,
  ShieldCheck,
  BookOpen,
  Mountain,
  TriangleAlert,
  FlaskConical,
  CloudSun,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { NavGroup, NavItem } from './navConfig';

interface NavDropdownProps {
  group: NavGroup;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
}

export const getNavIcon = (iconName: string) => {
  switch (iconName) {
    case 'Home': return Home;
    case 'Layers': return Layers;
    case 'Satellite': return Satellite;
    case 'Orbit': return Orbit;
    case 'Route': return Route;
    case 'ClipboardList': return ClipboardList;
    case 'GitCompare': return GitCompare;
    case 'FileText': return FileText;
    case 'Compass': return Compass;
    case 'ShieldCheck': return ShieldCheck;
    case 'BookOpen': return BookOpen;
    case 'Mountain': return Mountain;
    case 'TriangleAlert': return TriangleAlert;
    case 'FlaskConical': return FlaskConical;
    case 'CloudSun': return CloudSun;
    default: return Layers;
  }
};

export const NavDropdown: React.FC<NavDropdownProps> = ({
  group,
  isOpen,
  onOpen,
  onClose,
  onToggle
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if any item in this group matches current route
  const currentPath = location.pathname;
  const isGroupActive = group.items.some((item) => {
    if (item.to === '/') return currentPath === '/' || currentPath === '';
    return currentPath === item.to || currentPath.startsWith(item.to + '/');
  });

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Hover with 150ms intent delay
  const handleMouseEnter = () => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        onOpen();
      }, 150);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handleItemClick = (to: string) => {
    navigate(to);
    onClose();
  };

  const panelWidth = group.id === 'home' ? 'w-[360px]' : 'w-[400px]';

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-display text-sm uppercase tracking-wider font-semibold transition-all cursor-pointer relative ${
          isOpen || isGroupActive
            ? 'text-[#FF7043] bg-[#1C2027]/60'
            : 'text-[#E7E1D8] hover:text-[#FF7043] hover:bg-[#1C2027]/40'
        }`}
      >
        <span>{group.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#FF7043]' : 'text-[#A0A0A0]'
          }`}
        />
        {/* Active Route underline */}
        {isGroupActive && (
          <span className="absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-[#FF7043] rounded-full" />
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          role="menu"
          className={`absolute left-0 top-full mt-2 ${panelWidth} rounded-2xl bg-[#101114]/95 backdrop-blur-xl border border-[rgba(231,225,216,0.12)] shadow-[0_12px_40px_rgba(0,0,0,0.65)] p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150`}
        >
          {group.items.map((item, idx) => {
            const Icon = getNavIcon(item.icon);
            const isItemActive =
              item.to === '/'
                ? currentPath === '/' || currentPath === ''
                : currentPath === item.to || currentPath.startsWith(item.to + '/');

            return (
              <button
                key={item.id}
                role="menuitem"
                onClick={() => handleItemClick(item.to)}
                style={{ animationDelay: `${idx * 20}ms` }}
                className={`w-full flex items-center gap-3.5 p-2.5 rounded-xl text-left transition-all cursor-pointer group relative ${
                  isItemActive
                    ? 'bg-[#1C2027] border-l-2 border-[#FF7043]'
                    : 'hover:bg-[#1C2027] hover:border-l-2 hover:border-[#FF7043] border-l-2 border-transparent'
                }`}
              >
                {/* 40px Icon Tile */}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    isItemActive
                      ? 'bg-[#C65D38] text-white shadow-md shadow-[#C65D38]/30'
                      : 'bg-[#1C2027] text-[#C65D38] border border-[rgba(231,225,216,0.08)] group-hover:border-[#FF7043]/40'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-medium text-[15px] text-[#E7E1D8] group-hover:text-white truncate">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#C65D38]/20 text-[#FF7043] border border-[#FF7043]/30">
                        {item.badge}
                      </span>
                    )}
                    {isItemActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF7043] shrink-0" />
                    )}
                  </div>
                  <p className="text-[12.5px] font-sans text-[#A0A0A0] group-hover:text-[#E7E1D8]/80 truncate mt-0.5">
                    {item.desc}
                  </p>
                </div>

                {/* Right Chevron */}
                <ChevronRight className="w-4 h-4 text-[#6B6F76] group-hover:text-[#FF7043] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
