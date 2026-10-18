import React from 'react';
import type { ProvenanceStatus } from '../../types/weather';
import type { Provenance } from '../../core/types';
import { ExternalLink, Database, AlertCircle, CheckCircle2, History, Sparkles, Cpu, ShieldAlert } from 'lucide-react';

interface SourceBadgeProps {
  status?: ProvenanceStatus | Provenance | string;
  sourceName: string;
  sourceUrl?: string;
  className?: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  status = 'HISTORICAL',
  sourceName,
  sourceUrl,
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'MEASURED':
      case 'LIVE':
        return {
          bg: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300',
          dot: 'bg-emerald-400 animate-pulse',
          label: 'MEASURED / GROUND TRUTH',
          icon: CheckCircle2
        };
      case 'NASA-DERIVED':
      case 'CACHED':
        return {
          bg: 'bg-sky-950/80 border-sky-500/40 text-sky-300',
          dot: 'bg-sky-400',
          label: 'NASA-DERIVED',
          icon: Database
        };
      case 'MODELED':
        return {
          bg: 'bg-indigo-950/80 border-indigo-500/40 text-indigo-300',
          dot: 'bg-indigo-400',
          label: 'MODELED ESTIMATE',
          icon: Cpu
        };
      case 'SIMULATED':
      case 'HISTORICAL':
        return {
          bg: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
          dot: 'bg-amber-400',
          label: 'SIMULATED ASSUMPTION',
          icon: History
        };
      case 'UNKNOWN':
      case 'UNAVAILABLE':
        return {
          bg: 'bg-rose-950/80 border-rose-500/40 text-rose-300',
          dot: 'bg-rose-400',
          label: 'UNKNOWN / UNMEASURED',
          icon: ShieldAlert
        };
      case 'DEMO':
        return {
          bg: 'bg-purple-950/80 border-purple-500/40 text-purple-300',
          dot: 'bg-purple-400',
          label: 'ILLUSTRATIVE DEMO',
          icon: AlertCircle
        };
      default:
        return {
          bg: 'bg-slate-900 border-slate-700 text-slate-300',
          dot: 'bg-slate-400',
          label: String(status).toUpperCase(),
          icon: AlertCircle
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono border ${config.bg} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span className="font-semibold">{config.label}</span>
      <span className="text-mars-muted">|</span>
      <span className="truncate max-w-[140px] text-mars-text" title={sourceName}>
        {sourceName}
      </span>
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-mars-orange hover:text-mars-orange-bright transition-colors ml-0.5"
          title={`View NASA Source: ${sourceUrl}`}
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
};
