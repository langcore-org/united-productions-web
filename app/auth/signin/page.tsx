"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Chrome, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#ff6b00] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">UP</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">AI Hub</h1>
          <p className="text-gray-400">United Productions 制作支援統合プラットフォーム</p>
        </div>

        {/* Sign In Card */}
        <div className="bg-[#1a1a24] border border-[#2a2a35] rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-white mb-2 text-center">
            サインイン
          </h2>
          <p className="text-sm text-gray-500 mb-6 text-center">
            Google Workspace アカウントでログインしてください
          </p>

          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className={cn(
              "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl",
              "bg-white text-gray-900 font-medium",
              "hover:bg-gray-100 transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed"
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
