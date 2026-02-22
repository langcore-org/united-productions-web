"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

/**
 * ログアウトページ
 * 自動的にサインアウト処理を実行し、サインインページへリダイレクト
 */
export default function LogoutPage() {
  useEffect(() => {
    signOut({ callbackUrl: "/auth/signin" });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
        <p className="text-gray-600">ログアウト中...</p>
      </div>
    </div>
  );
}
