import React from 'react';
import { CheckCircle2, Database, Cpu, History, HelpCircle, ExternalLink } from 'lucide-react';

export type ProvenanceType = 'MEASURED' | 'NASA-DERIVED' | 'MODELED' | 'SIMULATED' | 'UNKNOWN';

interface ProvenanceBadgeProps {
  type: ProvenanceType | string;
  source?: string;
  url?: string;
  retrieved?: string;
  className?: string;
  showIcon?: boolean;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  type,
  source,
  url,
  retrieved,
  className = '',
  showIcon = true
}) => {
  const normType = (type || 'UNKNOWN').toUpperCase();

  const getConfig = () => {
    switch (normType) {
      case 'MEASURED':
        return {
          label: 'MEASURED',
          color: 'var(--prov-measured)',
          bg: 'rgba(74, 222, 128, 0.12)',
          border: 'rgba(74, 222, 128, 0.3)',
          icon: CheckCircle2,
          desc: 'Direct in-situ instrument measurement from landed mission.'
        };
      case 'NASA-DERIVED':
        return {
          label: 'NASA-DERIVED',
          color: 'var(--prov-nasa)',
          bg: 'rgba(86, 217, 232, 0.12)',
          border: 'rgba(86, 217, 232, 0.3)',
          icon: Database,
          desc: 'Direct extraction from NASA/ESA/USGS orbital dataset or catalog.'
        };
      case 'MODELED':
        return {
          label: 'MODELED',
          color: 'var(--prov-modeled)',
          bg: 'rgba(245, 181, 68, 0.12)',
          border: 'rgba(245, 181, 68, 0.3)',
          icon: Cpu,
          desc: 'Deterministic planetary physical model (e.g. MOLA temperature, Mars24).'
        };
      case 'SIMULATED':
        return {
          label: 'SIMULATED',
          color: 'var(--prov-simulated)',
          bg: 'rgba(179, 146, 240, 0.12)',
          border: 'rgba(179, 146, 240, 0.3)',
          icon: History,
          desc: 'Engineering assumption or ECLSS life-support operational simulation.'
        };
      case 'UNKNOWN':
      default:
        return {
          label: 'UNKNOWN',
          color: 'var(--prov-unknown)',
          bg: 'rgba(122, 127, 135, 0.15)',
          border: 'rgba(122, 127, 135, 0.35)',
          icon: HelpCircle,
          desc: 'Data unavailable or unverified. Not verified safe.'
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  const tooltipText = [
    `${config.label}: ${config.desc}`,
    source ? `Source: ${source}` : null,
    retrieved ? `Retrieved: ${retrieved}` : null
  ].filter(Boolean).join(' • ');

  const content = (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-wider uppercase transition-all select-none ${className}`}
      style={{
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color
      }}
      title={tooltipText}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: config.color }}
      />
      {showIcon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{config.label}</span>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity ml-0.5"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Open source: ${source || 'NASA Source'}`}
        >
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )}
    </span>
  );

  return content;
};
