export default function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card-bg p-6 shadow-sm flex flex-col justify-between h-full min-h-[140px]">
      <div className="h-4 animate-shimmer rounded w-1/2 mb-4"></div>
      <div className="h-8 animate-shimmer rounded w-3/4 mt-auto"></div>
    </div>
  );
}
