/**
 * Research Layout
 *
 * PJ-C リサーチ・考査機能のレイアウト
 */

import { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "リサーチ・考査 - AI Hub",
  description: "人探し、エビデンス確認、ロケ地探しのためのAIリサーチ機能",
};

export default function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#0d0d12]">
      <Sidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
