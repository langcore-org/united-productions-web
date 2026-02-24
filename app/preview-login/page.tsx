"use client";

import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function PreviewLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPreview = process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("preview-credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("メールアドレスまたはパスワードが正しくありません");
      } else {
        router.push("/");
      }
    } catch {
      setError("ログイン中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // Preview環境でない場合の表示
  if (!isPreview) {
    return (
      <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#ff6b00] flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">UP</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Teddy</h1>
          </div>

          {/* Error Card */}
          <div className="bg-[#1a1a24] border border-[#2a2a35] rounded-2xl p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">アクセス制限</h2>
              <p className="text-gray-400">このページはPreview環境でのみ利用可能です</p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-600 text-sm mt-8">
            © 2026 AD Production. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#ff6b00] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">UP</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Teddy</h1>
          <p className="text-gray-400">Preview環境 ログイン</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#1a1a24] border border-[#2a2a35] rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-white mb-2 text-center">ログイン</h2>
          <p className="text-sm text-gray-500 mb-6 text-center">
            Preview環境用のアカウントでログインしてください
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="preview@example.com"
                  required
                  disabled={isLoading}
                  className={cn(
                    "w-full pl-12 pr-4 py-4 rounded-xl",
                    "bg-[#0d0d12] border border-[#2a2a35]",
                    "text-white placeholder-gray-600",
                    "focus:outline-none focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00]",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all duration-200",
                  )}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">
                パスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className={cn(
                    "w-full pl-12 pr-12 py-4 rounded-xl",
                    "bg-[#0d0d12] border border-[#2a2a35]",
                    "text-white placeholder-gray-600",
                    "focus:outline-none focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00]",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all duration-200",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2",
                    "text-gray-500 hover:text-gray-400",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-colors duration-200",
                  )}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl mt-6",
                "bg-[#ff6b00] text-white font-medium",
                "hover:bg-[#ff8533] transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  ログイン中...
                </>
              ) : (
                "ログイン"
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#2a2a35]">
            <p className="text-xs text-gray-500 text-center">
              Preview環境専用のログインページです。
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-sm mt-8">
          © 2026 United Productions. All rights reserved.
        </p>
      </div>
    </div>
  );
}
