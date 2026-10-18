import React from 'react';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'panel' | 'card' | 'elevated' | 'subtle';
  glow?: 'orange' | 'cyan' | 'none';
  children?: React.ReactNode;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  variant = 'panel',
  glow = 'none',
  className = '',
  children,
  style,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return 'bg-[#15181D]/85 backdrop-blur-md border border-[rgba(231,225,216,0.12)] shadow-lg';
      case 'elevated':
        return 'bg-[#1C2027]/90 backdrop-blur-md border border-[rgba(231,225,216,0.18)] shadow-xl';
      case 'subtle':
        return 'bg-[#101114]/60 backdrop-blur-sm border border-[rgba(231,225,216,0.06)]';
      case 'panel':
      default:
        return 'glass-panel';
    }
  };

  const getGlowStyles = () => {
    switch (glow) {
      case 'orange':
        return 'glow-orange';
      case 'cyan':
        return 'glow-cyan';
      case 'none':
      default:
        return '';
    }
  };

  return (
    <div
      className={`rounded-xl transition-all ${getVariantStyles()} ${getGlowStyles()} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};
