"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    default: "認証中にエラーが発生しました。",
    configuration: "サーバー設定に問題があります。",
    accessdenied: "アクセスが拒否されました。",
    verification: "認証リンクの有効期限が切れています。",
    signin: "サインインに失敗しました。",
    callback: "コールバック処理中にエラーが発生しました。",
    oauthaccountnotlinked: "このアカウントは既に別のプロバイダーと連携されています。",
    sessionrequired: "このページにアクセスするにはログインが必要です。",
  };

  const errorMessage = error ? errorMessages[error] || errorMessages.default : errorMessages.default;

  return (
    <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#ff6b00] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">UP</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">AI Hub</h1>
        </div>

        {/* Error Card */}
        <div className="bg-[#1a1a24] border border-red-500/20 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-white">認証エラー</h2>
          </div>

          <p className="text-gray-400 mb-6">{errorMessage}</p>

          <Link
            href="/auth/signin"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-[#ff6b00] text-white font-medium hover:bg-[#ff8533] transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            ログイン画面に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
