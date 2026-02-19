export default function Loading() {
  return (
    <div className="flex flex-col h-full bg-[#0a0a0f]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0f]/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 animate-pulse" />
          <div className="space-y-2">
            <div className="w-32 h-5 bg-white/10 rounded animate-pulse" />
            <div className="w-24 h-3 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
        <div className="w-40 h-10 bg-white/10 rounded-xl animate-pulse" />
      </div>

      {/* Empty State Skeleton */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-24 h-24 rounded-3xl bg-white/10 animate-pulse mb-8" />
        <div className="w-48 h-8 bg-white/10 rounded animate-pulse mb-3" />
        <div className="w-64 h-4 bg-white/5 rounded animate-pulse mb-8" />

        {/* Suggestion Cards */}
        <div className="w-full max-w-lg space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="w-full h-16 bg-white/5 rounded-xl animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-white/5 bg-[#0a0a0f]/90 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center gap-2 mb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="w-24 h-10 bg-white/10 rounded-full animate-pulse"
              />
            ))}
          </div>
          <div className="h-14 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
