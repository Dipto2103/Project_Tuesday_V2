import React from 'react';

export const PageSkeleton: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col p-6 sm:p-10 gap-6 animate-pulse select-none bg-[#0B0D10]">
      {/* Top Header Skeleton */}
      <div className="flex items-center justify-between border-b border-[rgba(231,225,216,0.08)] pb-4">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-[#1C2027] rounded" />
          <div className="h-8 w-64 bg-[#15181D] rounded-lg" />
        </div>
        <div className="h-6 w-24 bg-[#1C2027] rounded-full" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-48 bg-[#15181D] rounded-2xl border border-[rgba(231,225,216,0.06)]" />
        <div className="h-48 bg-[#15181D] rounded-2xl border border-[rgba(231,225,216,0.06)]" />
        <div className="h-48 bg-[#15181D] rounded-2xl border border-[rgba(231,225,216,0.06)]" />
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 min-h-[300px] bg-[#15181D]/60 rounded-3xl border border-[rgba(231,225,216,0.06)]" />
    </div>
  );
};
