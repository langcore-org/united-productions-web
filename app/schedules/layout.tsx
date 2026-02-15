/**
 * ロケスケジュール管理ページレイアウト
 * 
 * サイドバーとメインコンテンツエリアを配置
 * Grok UI風のダークテーマ
 */

import { Sidebar } from "@/components/layout/Sidebar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ロケスケ管理 - AI Hub",
  description: "ロケスケジュールの作成・管理・自動生成",
};

export default function SchedulesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-[#0d0d12]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
