import React from 'react';
import { ProvenanceBadge, ProvenanceType } from './ProvenanceBadge';

export interface StatCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  subline?: string;
  statusText?: string;
  statusLevel?: 'ok' | 'warn' | 'danger' | 'unknown';
  provenance?: ProvenanceType | string;
  source?: string;
  url?: string;
  className?: string;
  compact?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  unit,
  subline,
  statusText,
  statusLevel = 'ok',
  provenance = 'MODELED',
  source,
  url,
  className = '',
  compact = false
}) => {
  const getStatusDotColor = () => {
    switch (statusLevel) {
      case 'ok': return 'bg-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.6)]';
      case 'warn': return 'bg-[#F5B544] shadow-[0_0_8px_rgba(245,181,68,0.6)]';
      case 'danger': return 'bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]';
      case 'unknown':
      default: return 'bg-[#7A7F87]';
    }
  };

  return (
    <div
      className={`relative rounded-xl bg-[#15181D]/80 backdrop-blur-md border border-[rgba(231,225,216,0.10)] hover:border-[rgba(231,225,216,0.22)] transition-all p-4 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-[#A0A0A0]">
          {icon && <span className="text-[#FF7043] shrink-0">{icon}</span>}
          <span className="text-[11px] font-mono tracking-widest uppercase text-[#A0A0A0] font-medium">
            {label}
          </span>
        </div>
        {provenance && (
          <ProvenanceBadge
            type={provenance}
            source={source}
            url={url}
            showIcon={false}
          />
        )}
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span className="text-2xl lg:text-3xl font-mono font-bold text-[#E7E1D8] tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-mono text-[#A0A0A0] font-medium">
            {unit}
          </span>
        )}
      </div>

      <div className="mt-1 flex items-center justify-between text-xs">
        {statusText && (
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusDotColor()}`} />
            <span className="font-mono text-xs text-[#E7E1D8]">{statusText}</span>
          </div>
        )}
        {subline && (
          <span className="text-[#A0A0A0] text-xs font-sans truncate">
            {subline}
          </span>
        )}
      </div>
    </div>
  );
};
