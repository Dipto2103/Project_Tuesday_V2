import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, Sliders } from 'lucide-react';
import { NAV } from './navConfig';
import { NavDropdown } from './NavDropdown';
import { MissionClockChip } from './MissionClockChip';
import { MobileMenu } from './MobileMenu';
import { SettingsModal } from '../common/SettingsModal';

interface TopBarProps {
  onOpenSearch?: () => void;
  className?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenSearch, className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Detect scroll > 8px
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setOpenMenuId(null);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const isHeroLanding = location.pathname === '/' || location.pathname === '';

  return (
    <>
      <header
        className={`sticky top-0 z-40 h-16 w-full transition-all duration-200 select-none ${
          isHeroLanding && !isScrolled
            ? 'glass-panel border-b border-[rgba(231,225,216,0.10)]'
            : 'bg-[#0B0D10]/95 backdrop-blur-md border-b border-[rgba(231,225,216,0.12)] shadow-md'
        } ${className}`}
      >
        <div className="h-full max-w-[1720px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Left: Brand + Dropdowns */}
          <div className="flex items-center gap-6 lg:gap-8">
            {/* Logo */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-3 group cursor-pointer focus:outline-none"
              aria-label="Mars Lantern - Return to Landing Page"
            >
              <div
                className="w-10 h-10 rounded-[12px] flex items-center justify-center shadow-lg shadow-black/40 overflow-hidden shrink-0 group-hover:scale-105 transition-transform"
                style={{ backgroundColor: '#FBF8F2' }}
              >
                <img
                  src={`${import.meta.env.BASE_URL}brand/icon-64.png`}
                  alt="MARS LANTERN Icon"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold tracking-wider text-base sm:text-lg text-[#E7E1D8] group-hover:text-white transition-colors">
                    MARS LANTERN
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#C65D38]/20 text-[#FF7043] border border-[#FF7043]/30">
                    FIELD ATLAS
                  </span>
                </div>
                <p className="text-[10px] font-mono text-[#A0A0A0] hidden xl:block">
                  Carry the light. Read the planet.
                </p>
              </div>
            </button>

            {/* Desktop Navigation Menus in exact required order */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2" aria-label="Main Navigation">
              {NAV.map((group) => (
                <NavDropdown
                  key={group.id}
                  group={group}
                  isOpen={openMenuId === group.id}
                  onOpen={() => setOpenMenuId(group.id)}
                  onClose={() => setOpenMenuId((cur) => (cur === group.id ? null : cur))}
                  onToggle={() =>
                    setOpenMenuId((cur) => (cur === group.id ? null : group.id))
                  }
                />
              ))}
            </nav>
          </div>

          {/* Right: Mission Clock Chip, Search, Hamburger */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            <MissionClockChip />

            {/* Settings Trigger */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 rounded-xl bg-[#15181D]/80 hover:bg-[#1C2027] border border-[rgba(231,225,216,0.10)] text-[#A0A0A0] hover:text-[#FF7043] transition-all cursor-pointer"
              aria-label="Simulation Assumptions & Settings"
              title="Simulation Assumptions & Constants"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Search Trigger */}
            {onOpenSearch && (
              <button
                type="button"
                onClick={onOpenSearch}
                className="p-2.5 rounded-xl bg-[#15181D]/80 hover:bg-[#1C2027] border border-[rgba(231,225,216,0.10)] text-[#A0A0A0] hover:text-[#E7E1D8] transition-all cursor-pointer"
                aria-label="Search Atlas & Coordinates"
                title="Search checkpoints, coordinates & articles (Ctrl+K)"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2.5 rounded-xl bg-[#15181D]/80 hover:bg-[#1C2027] border border-[rgba(231,225,216,0.10)] text-[#E7E1D8] transition-all cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Assumptions & Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};
