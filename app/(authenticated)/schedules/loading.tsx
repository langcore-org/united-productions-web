export default function Loading() {
  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="w-48 h-8 bg-white/10 rounded animate-pulse" />
          <div className="w-64 h-4 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="w-40 h-10 bg-white/10 rounded-xl animate-pulse" />
      </div>

      {/* Table Skeleton */}
      <div className="flex-1 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-6 gap-4 p-4 border-b border-white/10 bg-white/5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-5 bg-white/10 rounded animate-pulse" />
          ))}
        </div>

        {/* Table Rows */}
        {Array.from({ length: 8 }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-6 gap-4 p-4 border-b border-white/5"
          >
            {Array.from({ length: 6 }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="h-4 bg-white/5 rounded animate-pulse"
                style={{ animationDelay: `${(rowIndex * 6 + colIndex) * 50}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
