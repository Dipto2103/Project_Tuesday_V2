import React from 'react';

export interface TabOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md'
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl bg-[#101114]/90 border border-[rgba(231,225,216,0.12)] select-none ${className}`}
      role="tablist"
    >
      {options.map((opt) => {
        const isActive = opt.id === value;
        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 font-display font-medium rounded-lg transition-all cursor-pointer ${
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs sm:text-sm'
            } ${
              isActive
                ? 'bg-[#C65D38] text-white shadow-md shadow-[#C65D38]/30 font-semibold'
                : 'text-[#A0A0A0] hover:text-[#E7E1D8] hover:bg-[#1C2027]/50'
            }`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.badge && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30">
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
