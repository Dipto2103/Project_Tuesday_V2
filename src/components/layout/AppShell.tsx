import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TopBar } from '../nav/TopBar';
import { SideRail } from '../nav/SideRail';
import { BottomTabs } from '../nav/BottomTabs';
import { CommandPalette } from '../common/CommandPalette';
import { DocumentationModal } from '../common/DocumentationModal';
import type { Checkpoint } from '../../core/types';

export const AppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);

  // Fetch checkpoints once for geocoding & search
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/checkpoints.json`)
      .then((r) => r.json())
      .then((data: Checkpoint[]) => setCheckpoints(data))
      .catch((err) => console.warn('[SHELL] Could not load checkpoints for search:', err));
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync /about route to documentation modal
  useEffect(() => {
    if (location.pathname === '/about') {
      setIsDocsOpen(true);
    }
  }, [location.pathname]);

  const handleCloseDocs = () => {
    setIsDocsOpen(false);
    if (location.pathname === '/about') {
      navigate(-1);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0B0D10] text-[#E7E1D8] font-sans antialiased selection:bg-[#FF7043] selection:text-white">
      {/* Skip to Content for A11y */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-[#C65D38] text-white font-mono rounded-lg shadow-xl"
      >
        Skip to main content
      </a>

      {/* Top Bar (Height 64px) */}
      <TopBar onOpenSearch={() => setIsSearchOpen(true)} />

      {/* Main Body: Left Icon Rail (Desktop) + Page Outlet */}
      <div className="flex flex-1 overflow-hidden relative">
        <SideRail />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 relative h-full overflow-y-auto flex flex-col focus:outline-none"
        >
          <Outlet context={{ checkpoints }} />
        </main>
      </div>

      {/* Mobile Bottom Tabs */}
      <BottomTabs />

      {/* Command Palette Search Modal */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        checkpoints={checkpoints}
      />

      {/* Documentation / About Modal */}
      <DocumentationModal
        isOpen={isDocsOpen}
        onClose={handleCloseDocs}
      />
    </div>
  );
};
