import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { NAV, NavGroup, NavItem } from './navConfig';
import { getNavIcon } from './NavDropdown';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>('home');

  if (!isOpen) return null;

  const handleNavigate = (to: string) => {
    navigate(to);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex flex-col bg-[#0B0D10]/98 backdrop-blur-2xl">
      {/* Top Header */}
      <div className="h-16 px-4 border-b border-[rgba(231,225,216,0.10)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
            style={{ backgroundColor: '#FBF8F2' }}
          >
            <img
              src={`${import.meta.env.BASE_URL}brand/icon-64.png`}
              alt="MARS LANTERN"
              className="w-8 h-8 object-contain"
            />
          </div>
          <div>
            <span className="font-display font-bold tracking-wider text-base text-[#E7E1D8]">
              MARS LANTERN
            </span>
            <p className="text-[10px] font-mono text-[#A0A0A0]">FIELD ATLAS</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-lg text-[#A0A0A0] hover:text-white hover:bg-[#1C2027] cursor-pointer"
          aria-label="Close menu"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Accordions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {NAV.map((group) => {
          const isExpanded = openGroup === group.id;
          return (
            <div
              key={group.id}
              className="rounded-2xl bg-[#15181D]/80 border border-[rgba(231,225,216,0.10)] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenGroup(isExpanded ? null : group.id)}
                className="w-full flex items-center justify-between p-4 font-display font-bold text-sm tracking-wider uppercase text-[#E7E1D8] cursor-pointer"
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#A0A0A0] transition-transform duration-200 ${
                    isExpanded ? 'rotate-180 text-[#FF7043]' : ''
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="p-2 pt-0 space-y-1 border-t border-[rgba(231,225,216,0.06)]">
                  {group.items.map((item) => {
                    const Icon = getNavIcon(item.icon);
                    const isItemActive =
                      item.to === '/'
                        ? location.pathname === '/' || location.pathname === ''
                        : location.pathname === item.to || location.pathname.startsWith(item.to + '/');

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.to)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all ${
                          isItemActive
                            ? 'bg-[#C65D38]/20 border border-[#FF7043]/50 text-white'
                            : 'hover:bg-[#1C2027] text-[#E7E1D8]'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isItemActive
                              ? 'bg-[#C65D38] text-white'
                              : 'bg-[#1C2027] text-[#FF7043]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-medium text-sm text-[#E7E1D8] truncate">
                            {item.label}
                          </p>
                          <p className="text-xs text-[#A0A0A0] truncate">
                            {item.desc}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#6B6F76] shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
