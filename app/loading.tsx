import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-[#ff6b00] animate-spin" />
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    </div>
  );
}
