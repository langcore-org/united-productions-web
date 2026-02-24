export default function Loading() {
  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="w-48 h-8 bg-white/10 rounded animate-pulse" />
          <div className="w-64 h-4 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="w-24 h-10 bg-white/10 rounded-xl animate-pulse" />
          <div className="w-32 h-10 bg-white/10 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4">
        {/* Template Selector */}
        <div className="flex gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="w-32 h-10 bg-white/10 rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Editor Area */}
        <div className="grid grid-cols-2 gap-6 h-[500px]">
          <div className="bg-white/5 border border-white/10 rounded-xl animate-pulse" />
          <div className="bg-white/5 border border-white/10 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
