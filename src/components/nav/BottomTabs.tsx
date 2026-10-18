import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BOTTOM_TABS } from './navConfig';
import { getNavIcon } from './NavDropdown';

export const BottomTabs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0B0D10]/95 backdrop-blur-xl border-t border-[rgba(231,225,216,0.12)] z-40 px-2 pb-[env(safe-area-inset-bottom)] flex items-center justify-around select-none shadow-[0_-8px_20px_rgba(0,0,0,0.5)]"
      aria-label="Mobile Bottom Navigation"
    >
      {BOTTOM_TABS.map((tab) => {
        const Icon = getNavIcon(tab.icon);
        const isActive =
          currentPath === tab.to || currentPath.startsWith(tab.to + '/');

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigate(tab.to)}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-[#FF7043]'
                : 'text-[#A0A0A0] hover:text-[#E7E1D8]'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg transition-transform ${
                isActive ? 'scale-110 bg-[#FF7043]/15' : ''
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span
              className={`text-[11px] font-display font-medium ${
                isActive ? 'font-bold' : ''
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
