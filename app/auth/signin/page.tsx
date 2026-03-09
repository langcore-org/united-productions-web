"use client";

import { Chrome, Loader2 } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "openid email profile",
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) throw signInError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "サインインに失敗しました");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-600 flex items-center justify-center mx-auto mb-4">
            <svg
              width="40"
              height="40"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Teddy Logo"
            >
              <circle cx="8" cy="8" r="4" fill="#8B4513" />
              <circle cx="24" cy="8" r="4" fill="#8B4513" />
              <ellipse cx="16" cy="18" rx="10" ry="9" fill="#D2691E" />
              <circle cx="12" cy="15" r="1.5" fill="white" />
              <circle cx="20" cy="15" r="1.5" fill="white" />
              <ellipse cx="16" cy="19" rx="2.5" ry="1.8" fill="#1a1a1a" />
              <path
                d="M13 22 Q16 25 19 22"
                stroke="#1a1a1a"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Teddy</h1>
          <p className="text-gray-400">あなたのAIアシスタント</p>
        </div>

        {/* Sign In Card */}
        <div className="bg-[#1a1a24] border border-[#2a2a35] rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-white mb-2 text-center">サインイン</h2>
          <p className="text-sm text-gray-500 mb-6 text-center">
            Google Workspace アカウントでログインしてください
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSignIn}
            disabled={isLoading}
            className={cn(
              "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl",
              "bg-white text-gray-900 font-medium",
              "hover:bg-gray-100 transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                ログイン中...
              </>
            ) : (
              <>
                <Chrome className="w-5 h-5" />
                Googleでログイン
              </>
            )}
          </button>

          <div className="mt-6 pt-6 border-t border-[#2a2a35]">
            <p className="text-xs text-gray-500 text-center">
              ログインすることで、社内データへのアクセスが可能になります。
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
