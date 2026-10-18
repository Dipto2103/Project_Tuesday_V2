import React from 'react';
import { Check } from 'lucide-react';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onToggle?: () => void;
  icon?: React.ReactNode;
  color?: string;
  count?: number;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onToggle,
  icon,
  color,
  count,
  className = ''
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all select-none cursor-pointer border ${
        selected
          ? 'bg-[#C65D38]/20 border-[#FF7043] text-white shadow-sm'
          : 'bg-[#15181D]/80 border-[rgba(231,225,216,0.12)] text-[#A0A0A0] hover:text-[#E7E1D8] hover:border-[rgba(231,225,216,0.25)]'
      } ${className}`}
    >
      {selected ? (
        <Check className="w-3 h-3 text-[#FF7043] shrink-0" />
      ) : (
        icon || (color && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
        ))
      )}
      <span>{label}</span>
      {count !== undefined && (
        <span className="text-[10px] font-mono px-1 rounded bg-black/40 text-[#A0A0A0]">
          {count}
        </span>
      )}
    </button>
  );
};
