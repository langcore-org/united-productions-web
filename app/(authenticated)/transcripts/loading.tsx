export default function Loading() {
  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="w-48 h-8 bg-white/10 rounded animate-pulse" />
          <div className="w-64 h-4 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="w-32 h-10 bg-white/10 rounded-xl animate-pulse" />
      </div>

      {/* Content Area */}
      <div className="flex-1 grid grid-cols-2 gap-6">
        {/* Input Area */}
        <div className="space-y-4">
          <div className="w-full h-[400px] bg-white/5 border border-white/10 rounded-xl animate-pulse" />
          <div className="flex justify-end gap-3">
            <div className="w-24 h-10 bg-white/10 rounded-lg animate-pulse" />
            <div className="w-32 h-10 bg-[#ff6b00]/20 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Output Area */}
        <div className="space-y-4">
          <div className="w-full h-[400px] bg-white/5 border border-white/10 rounded-xl animate-pulse" />
          <div className="flex justify-end">
            <div className="w-28 h-10 bg-white/10 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
