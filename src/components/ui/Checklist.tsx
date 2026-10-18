import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

export interface ChecklistItem {
  id: string;
  label: string;
  defaultChecked?: boolean;
}

export interface ChecklistProps {
  title?: string;
  items: ChecklistItem[];
  storageKey?: string;
  className?: string;
}

export const Checklist: React.FC<ChecklistProps> = ({
  title = 'DAILY CHECKLIST',
  items,
  storageKey = 'mars_daily_checklist',
  className = ''
}) => {
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    const initial: Record<string, boolean> = {};
    items.forEach((item) => {
      initial[item.id] = item.defaultChecked ?? false;
    });
    return initial;
  });

  const toggleItem = (id: string) => {
    setCheckedState((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div
      className={`rounded-2xl bg-[#15181D]/80 backdrop-blur-md border border-[rgba(231,225,216,0.10)] p-5 flex flex-col justify-between ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between mb-4 border-b border-[rgba(231,225,216,0.08)] pb-2.5">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#E7E1D8]">
            {title}
          </span>
          <span className="text-[11px] font-mono text-[#A0A0A0]">
            {Object.values(checkedState).filter(Boolean).length} / {items.length}
          </span>
        </div>
      )}

      <div className="space-y-2.5">
        {items.map((item) => {
          const isChecked = !!checkedState[item.id];
          return (
            <label
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1C2027]/60 cursor-pointer select-none transition-all group"
            >
              <div
                className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                  isChecked
                    ? 'bg-[#C65D38] border-[#FF7043] text-white shadow-sm'
                    : 'bg-[#101114] border-[rgba(231,225,216,0.20)] group-hover:border-[#FF7043]/60'
                }`}
              >
                {isChecked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
              </div>
              <span
                className={`text-sm font-sans transition-colors ${
                  isChecked ? 'text-[#A0A0A0] line-through' : 'text-[#E7E1D8]'
                }`}
              >
                {item.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};
