export default function Loading() {
  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-gray-950/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 animate-pulse" />
          <div className="space-y-2">
            <div className="w-32 h-5 bg-white/10 rounded animate-pulse" />
            <div className="w-24 h-3 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
        <div className="w-40 h-10 bg-white/10 rounded-xl animate-pulse" />
      </div>

      {/* Messages Skeleton */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* User Message */}
          <div className="flex gap-4 flex-row-reverse">
            <div className="w-9 h-9 rounded-xl bg-white/10 animate-pulse" />
            <div className="flex-1 max-w-[80%] flex flex-col items-end">
              <div className="w-3/4 h-20 bg-white/10 rounded-2xl rounded-tr-sm animate-pulse" />
            </div>
          </div>

          {/* Assistant Message */}
          <div className="flex gap-4">
            <div className="w-9 h-9 rounded-xl bg-gray-700/20 animate-pulse" />
            <div className="flex-1 max-w-[80%]">
              <div className="space-y-2">
                <div className="w-full h-4 bg-white/10 rounded animate-pulse" />
                <div className="w-5/6 h-4 bg-white/10 rounded animate-pulse" />
                <div className="w-4/6 h-4 bg-white/10 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          <div className="flex gap-4">
            <div className="w-9 h-9 rounded-xl bg-gray-700/20 animate-pulse" />
            <div className="flex items-center gap-2 py-4">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Skeleton */}
      <div className="border-t border-white/5 bg-gray-950/90 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="h-14 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
