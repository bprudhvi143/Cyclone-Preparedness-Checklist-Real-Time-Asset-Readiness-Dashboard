import React from "react";

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-soft space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-soft space-y-4 w-full">
      <div className="flex justify-between items-center pb-2">
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-8 w-1/3" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: rows }).map((_, idx) => (
          <Skeleton key={idx} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
};

export const ChartSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-soft space-y-4 w-full h-[350px] flex flex-col">
      <Skeleton className="h-5 w-1/4 mb-4" />
      <div className="flex-1 flex items-end gap-4 px-4 pb-4">
        <Skeleton className="h-[20%] flex-1" />
        <Skeleton className="h-[50%] flex-1" />
        <Skeleton className="h-[80%] flex-1" />
        <Skeleton className="h-[40%] flex-1" />
        <Skeleton className="h-[90%] flex-1" />
        <Skeleton className="h-[60%] flex-1" />
      </div>
    </div>
  );
};

export default Skeleton;
