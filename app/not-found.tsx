import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 rounded-2xl bg-[#2a2a35] flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="w-10 h-10 text-gray-400" />
        </div>

        <h1 className="text-4xl font-bold text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-white mb-4">ページが見つかりません</h2>
        <p className="text-gray-400 mb-8">
          お探しのページは存在しないか、移動された可能性があります。
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ff6b00] text-white font-medium hover:bg-[#ff8533] transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          トップページへ戻る
        </Link>
      </div>
    </div>
  );
}
