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
        {/* Logo - 削除済み */}

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


        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-sm mt-8">
          © 2026 United Productions. All rights reserved.
        </p>
      </div>
    </div>
  );
}
