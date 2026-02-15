"use client";

import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  FileText,
  Mic,
  Search,
  Calendar,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
  features: string[];
  color: string;
}

const featureCards: FeatureCard[] = [
  {
    id: "meeting-notes",
    title: "議事録・文字起こし",
    description: "Zoom文字起こしをAIで整形して議事録を作成",
    icon: <FileText className="w-6 h-6" />,
    href: "/meeting-notes",
    badge: "PJ-A",
    features: ["会議用テンプレート", "面談用テンプレート", "自動要約", "TODO抽出"],
    color: "#ff6b00",
  },
  {
    id: "transcripts",
    title: "起こし・NA原稿",
    description: "文字起こしデータからNA原稿を自動生成",
    icon: <Mic className="w-6 h-6" />,
    href: "/transcripts",
    badge: "PJ-B",
    features: ["NA原稿生成", "話者分離", "タイムコード", "編集支援"],
    color: "#ff6b00",
  },
  {
    id: "research",
    title: "リサーチ・考査",
    description: "AIを活用した調査・考査支援ツール",
    icon: <Search className="w-6 h-6" />,
    href: "/research",
    badge: "PJ-C",
    features: ["情報収集", "事実確認", "資料作成", "引用管理"],
    color: "#ff6b00",
  },
  {
    id: "schedules",
    title: "ロケスケ管理",
    description: "ロケーション撮影のスケジュール管理",
    icon: <Calendar className="w-6 h-6" />,
    href: "/schedules",
    badge: "PJ-D",
    features: ["スケジュール作成", "天気連携", "移動時間計算", "チーム共有"],
    color: "#ff6b00",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-[#0d0d12]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Welcome Section */}
            <section className="mb-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#ff6b00]/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#ff6b00]" />
                </div>
                <h1 className="text-2xl font-semibold text-white">
                  AI Hub ダッシュボード
                </h1>
              </div>
              <p className="text-gray-400 ml-[52px]">
                United Productions の制作支援統合プラットフォームへようこそ。
                <br className="hidden sm:block" />
                AIを活用して制作業務を効率化します。
              </p>
            </section>

            {/* Feature Cards Grid */}
            <section>
              <h2 className="text-sm font-medium text-gray-400 mb-6 uppercase tracking-wider">
                機能一覧
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {featureCards.map((card) => (
                  <Link
                    key={card.id}
                    href={card.href}
                    className={cn(
                      "group relative p-6 rounded-2xl",
                      "bg-[#1a1a24] border border-[#2a2a35]",
                      "hover:border-[#ff6b00]/50 hover:bg-[#1f1f2a]",
                      "transition-all duration-300 ease-out",
                      "flex flex-col"
                    )}
                  >
                    {/* Badge */}
                    {card.badge && (
                      <span className="absolute top-4 right-4 text-xs px-2 py-1 rounded-full bg-[#ff6b00]/10 text-[#ff6b00] font-medium">
                        {card.badge}
                      </span>
                    )}

                    {/* Icon & Title */}
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                          "bg-[#ff6b00]/10 text-[#ff6b00]",
                          "group-hover:bg-[#ff6b00]/20 transition-colors duration-300"
                        )}
                      >
                        {card.icon}
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="text-lg font-semibold text-white group-hover:text-[#ff6b00] transition-colors duration-300">
                          {card.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {card.description}
                        </p>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      {card.features.map((feature) => (
                        <span
                          key={feature}
                          className="text-xs px-2.5 py-1 rounded-full bg-[#2a2a35] text-gray-400"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="mt-auto flex items-center gap-2 text-sm font-medium text-gray-500 group-hover:text-[#ff6b00] transition-colors duration-300">
                      <span>開く</span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Quick Tips */}
            <section className="mt-12 pt-8 border-t border-[#2a2a35]">
              <h2 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">
                クイックヒント
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#1a1a24]/50 border border-[#2a2a35]/50">
                  <p className="text-sm text-gray-400">
                    <span className="text-[#ff6b00] font-medium">議事録・文字起こし</span>
                    {" "}では、Zoomの文字起こしテキストをAIが自動整形します
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#1a1a24]/50 border border-[#2a2a35]/50">
                  <p className="text-sm text-gray-400">
                    <span className="text-[#ff6b00] font-medium">リサーチ・考査</span>
                    {" "}では、AIが情報収集と事実確認をサポートします
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#1a1a24]/50 border border-[#2a2a35]/50">
                  <p className="text-sm text-gray-400">
                    <span className="text-[#ff6b00] font-medium">ロケスケ管理</span>
                    {" "}では、天気予報と連携したスケジュール管理が可能です
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
