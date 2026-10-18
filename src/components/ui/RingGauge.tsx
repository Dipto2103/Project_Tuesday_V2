import React, { useEffect, useState } from 'react';
import { ProvenanceBadge } from './ProvenanceBadge';

export interface RingGaugeProps {
  label: string;
  percentage: number;
  remainingText: string;
  icon?: React.ReactNode;
  strokeColor?: string;
  statusText?: string;
  statusLevel?: 'ok' | 'warn' | 'danger' | 'unknown';
  provenance?: string;
  source?: string;
  className?: string;
  size?: number;
}

export const RingGauge: React.FC<RingGaugeProps> = ({
  label,
  percentage,
  remainingText,
  icon,
  strokeColor,
  statusText = 'Nominal',
  statusLevel = 'ok',
  provenance = 'SIMULATED',
  source = 'NASA BVAD Model',
  className = '',
  size = 140
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    // Animate smoothly to percentage on mount
    const timer = setTimeout(() => {
      setAnimatedProgress(Math.min(100, Math.max(0, percentage)));
    }, 50);
    return () => clearTimeout(timer);
  }, [percentage]);

  const radius = 52;
  const strokeWidth = 9;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  // Determine color based on status if not manually specified
  const getColor = () => {
    if (strokeColor) return strokeColor;
    if (animatedProgress >= 50) return '#4ADE80'; // ok green
    if (animatedProgress >= 25) return '#F5B544'; // warn amber
    return '#EF4444'; // danger red
  };

  const getStatusDotColor = () => {
    switch (statusLevel) {
      case 'ok': return 'bg-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.6)]';
      case 'warn': return 'bg-[#F5B544] shadow-[0_0_8px_rgba(245,181,68,0.6)]';
      case 'danger': return 'bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]';
      default: return 'bg-[#7A7F87]';
    }
  };

  const ringColor = getColor();

  return (
    <div
      className={`rounded-2xl bg-[#15181D]/80 backdrop-blur-md border border-[rgba(231,225,216,0.10)] p-5 flex flex-col items-center justify-between hover:border-[rgba(231,225,216,0.22)] transition-all ${className}`}
    >
      {/* Top Header */}
      <div className="w-full flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && <span className="text-[#FF7043] shrink-0">{icon}</span>}
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#E7E1D8]">
            {label}
          </span>
        </div>
        <ProvenanceBadge type={provenance} source={source} showIcon={false} />
      </div>

      {/* Circular Gauge */}
      <div className="relative my-2 flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox="0 0 128 128"
          className="transform -rotate-90"
        >
          {/* Background Track */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="transparent"
            stroke="#1C2027"
            strokeWidth={strokeWidth}
          />
          {/* Progress Arc */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="transparent"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-mono font-bold text-[#E7E1D8] tracking-tight">
            {Math.round(animatedProgress)}%
          </span>
          <span className="text-[10px] font-mono text-[#A0A0A0] uppercase tracking-wider mt-0.5">
            Capacity
          </span>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="w-full mt-2 pt-3 border-t border-[rgba(231,225,216,0.08)] flex items-center justify-between text-xs">
        <span className="text-[#E7E1D8] font-mono font-medium">
          {remainingText}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusDotColor()}`} />
          <span className="text-[11px] font-mono text-[#A0A0A0]">{statusText}</span>
        </div>
      </div>
    </div>
  );
};
