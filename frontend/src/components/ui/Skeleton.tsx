import React from 'react';

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-apple-lg p-4 flex gap-4 animate-pulse">
      {/* Thumbnail area skeleton */}
      <div className="w-16 h-16 rounded-apple-md bg-gray-100 dark:bg-[#1c1c1e] flex-shrink-0" />
      
      {/* Content description skeleton */}
      <div className="flex-1 flex flex-col justify-between py-1">
        <div className="space-y-2">
          <div className="h-4 bg-gray-100 dark:bg-[#1c1c1e] rounded w-5/6" />
          <div className="h-3 bg-gray-100 dark:bg-[#1c1c1e] rounded w-2/3" />
        </div>
        <div className="h-3 bg-gray-100 dark:bg-[#1c1c1e] rounded w-1/4" />
      </div>
    </div>
  );
};

export const CategorySkeleton: React.FC = () => {
  return (
    <div className="h-8 w-20 bg-gray-100 dark:bg-[#1c1c1e] rounded-full animate-pulse inline-block" />
  );
};
