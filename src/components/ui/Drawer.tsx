import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'w-full md:w-[380px] lg:w-[420px]',
  className = ''
}) => {
  // Close on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container: Right slide-out on desktop, bottom sheet on mobile */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        <aside
          className={`pointer-events-auto ${width} bg-[#101114]/95 backdrop-blur-xl border-l border-[rgba(231,225,216,0.12)] shadow-2xl flex flex-col h-full transform transition-transform ease-out duration-300 ${className}`}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[rgba(231,225,216,0.10)] flex items-center justify-between shrink-0">
            <div>
              {title && (
                <h2 className="text-base font-display font-bold uppercase tracking-wider text-[#E7E1D8]">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-xs font-mono text-[#A0A0A0] mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-[#A0A0A0] hover:text-[#E7E1D8] hover:bg-[#1C2027] transition-all cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {children}
          </div>
        </aside>
      </div>
    </div>
  );
};
