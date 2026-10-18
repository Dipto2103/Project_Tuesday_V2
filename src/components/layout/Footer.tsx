import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ExternalLink, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="w-full border-t border-[rgba(231,225,216,0.10)] bg-[#0B0D10] text-[#A0A0A0] py-8 px-6 text-xs font-sans mt-auto select-none">
      <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#FBF8F2' }}
          >
            <img
              src={`${import.meta.env.BASE_URL}brand/icon-32.png`}
              alt="Logo"
              className="w-5 h-5 object-contain"
            />
          </div>
          <div>
            <span className="font-display font-bold text-sm text-[#E7E1D8]">
              MARS LANTERN
            </span>
            <span className="text-[11px] text-[#6B6F76] ml-2">
              Carry the light. Read the planet.
            </span>
          </div>
        </div>

        {/* Center Credits */}
        <div className="text-center font-mono text-[11px] text-[#A0A0A0]">
          Built for NASA Space Apps 2026 • Data: NASA / JPL-Caltech / USGS / PSI
        </div>

        {/* Right Links */}
        <div className="flex items-center gap-4 font-display font-medium text-xs">
          <button
            onClick={() => navigate('/about')}
            className="hover:text-[#FF7043] transition-colors cursor-pointer"
          >
            Data & Credits
          </button>
          <span>•</span>
          <button
            onClick={() => navigate('/manual')}
            className="hover:text-[#FF7043] transition-colors cursor-pointer"
          >
            Field Manual
          </button>
          <span>•</span>
          <a
            href="https://mars.nasa.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-[#56D9E8] transition-colors"
          >
            <span>NASA Mars</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </footer>
  );
};
