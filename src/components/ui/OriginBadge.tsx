import React from 'react';
import { Wifi, HardDrive, FileCode } from 'lucide-react';

export type OriginType = 'LIVE' | 'CACHED' | 'FIXTURE' | 'OFFLINE';

interface OriginBadgeProps {
  origin: OriginType | string;
  className?: string;
}

export const OriginBadge: React.FC<OriginBadgeProps> = ({
  origin,
  className = ''
}) => {
  const norm = (origin || 'FIXTURE').toUpperCase();

  const getConfig = () => {
    switch (norm) {
      case 'LIVE':
        return {
          label: 'LIVE',
          color: 'var(--ok)',
          bg: 'rgba(74, 222, 128, 0.12)',
          border: 'rgba(74, 222, 128, 0.3)',
          icon: Wifi,
          title: 'Direct real-time HTTP fetch from remote service'
        };
      case 'CACHED':
        return {
          label: 'CACHED',
          color: 'var(--science-cyan)',
          bg: 'rgba(86, 217, 232, 0.12)',
          border: 'rgba(86, 217, 232, 0.3)',
          icon: HardDrive,
          title: 'Served from IndexedDB / localStorage cache'
        };
      case 'OFFLINE':
        return {
          label: 'OFFLINE',
          color: 'var(--warn)',
          bg: 'rgba(245, 181, 68, 0.12)',
          border: 'rgba(245, 181, 68, 0.3)',
          icon: HardDrive,
          title: 'Running in offline mode — local assets only'
        };
      case 'FIXTURE':
      default:
        return {
          label: 'FIXTURE',
          color: 'var(--text-dim)',
          bg: 'rgba(160, 160, 160, 0.12)',
          border: 'rgba(160, 160, 160, 0.25)',
          icon: FileCode,
          title: 'Served from verified local bundled JSON/DEM catalog'
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium tracking-wider uppercase select-none ${className}`}
      style={{
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color
      }}
      title={config.title}
    >
      <Icon className="w-2.5 h-2.5 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};
