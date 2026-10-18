import React from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showArrow?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  showArrow = false,
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[#C65D38] hover:bg-[#FF7043] active:bg-[#C65D38] text-white shadow-lg shadow-[#C65D38]/20 border border-[#FF7043]/30';
      case 'secondary':
        return 'bg-transparent hover:bg-[#1C2027] text-[#E7E1D8] border border-[rgba(231,225,216,0.20)] hover:border-[rgba(231,225,216,0.40)]';
      case 'ghost':
        return 'bg-transparent hover:bg-[#1C2027] text-[#A0A0A0] hover:text-[#E7E1D8] border border-transparent';
      case 'danger':
        return 'bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] border border-[#EF4444]/40';
      case 'icon':
        return 'bg-[#15181D]/80 hover:bg-[#1C2027] text-[#E7E1D8] border border-[rgba(231,225,216,0.10)] p-2.5';
    }
  };

  const getSizeStyles = () => {
    if (variant === 'icon') {
      switch (size) {
        case 'sm': return 'w-9 h-9 min-h-[36px] min-w-[36px] rounded-lg';
        case 'lg': return 'w-12 h-12 min-h-[48px] min-w-[48px] rounded-xl';
        default: return 'w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg';
      }
    }
    switch (size) {
      case 'sm':
        return 'min-h-[36px] px-3.5 py-1.5 text-xs rounded-lg gap-1.5';
      case 'lg':
        return 'min-h-[48px] px-6 py-3 text-base rounded-xl gap-2.5';
      default:
        return 'min-h-[44px] px-5 py-2.5 text-sm rounded-lg gap-2';
    }
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-display font-semibold uppercase tracking-wider transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-[#FFB070] disabled:opacity-45 disabled:pointer-events-none cursor-pointer ${getVariantStyles()} ${getSizeStyles()} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
      {showArrow && !isLoading && (
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 shrink-0" />
      )}
    </button>
  );
};
