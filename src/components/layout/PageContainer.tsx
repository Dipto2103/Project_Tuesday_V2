import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  fullBleed?: boolean;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  fullBleed = false,
  className = ''
}) => {
  if (fullBleed) {
    return (
      <div className={`flex-1 w-full h-full overflow-hidden ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div className={`flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 ${className}`}>
      {children}
    </div>
  );
};
