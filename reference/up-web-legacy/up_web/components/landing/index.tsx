"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Bot,
  FileText,
  FolderSync,
  Lightbulb,
  Menu,
  Pencil,
  Search,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";

// ============================================
// PublicHeader - モバイル対応ヘッダー
// ============================================
export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            AD-Agent
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden sm:flex items-center gap-4">
          <Button asChild className="bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white">
            <Link href="/auth/login">ログイン</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="sm:hidden p-2 text-gray-700"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
          <Button asChild className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white">
            <Link href="/auth/login">ログイン</Link>
          </Button>
        </div>
      )}
    </header>
  );
}

// ============================================
// HeroSection - インパクトのあるヒーロー（中央揃え・モバイル対応）
// ============================================
export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-white">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-200/40 to-cyan-200/40 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-orange-200/30 to-yellow-200/30 blur-3xl" />
      </div>

      <div className="container mx-auto relative px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* バッジ */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
            <Sparkles className="h-4 w-4" />
            番組制作をAIで革新
          </div>

          {/* メインコピー */}
          <h1 className="mb-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900">
            調査・企画・構成を
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 bg-clip-text text-transparent">
              AIエージェント
            </span>
            に任せる
          </h1>

          {/* サブコピー */}
          <p className="mb-8 sm:mb-10 text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            番組制作のあらゆる作業を効率化。
            <br className="hidden sm:block" />
            Google Driveと連携し、チーム全体の生産性を向上させます。
          </p>

          {/* 数値実績 */}
          <div className="mt-12 sm:mt-16 grid grid-cols-3 gap-4 sm:gap-8">
            {[
              { value: "50%", label: "作業時間削減" },
              { value: "4種類", label: "AIエージェント" },
              { value: "∞", label: "アイデア創出" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs sm:text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ヒーロー画像 */}
        <div className="mt-12 sm:mt-16 flex justify-center px-4">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-blue-500/10">
            <Image
              src="/images/lp/hero-main.png"
              alt="AD-Agent Platform"
              width={1200}
              height={675}
              className="w-full"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// ProblemSection - 課題提起（中央揃え・モバイル対応）
// ============================================
export function ProblemSection() {
  const problems = [
    {
      icon: Search,
      title: "リサーチに時間がかかる",
      description: "調査作業に何時間も費やしていませんか？",
    },
    {
      icon: FileText,
      title: "毎回の文脈説明が面倒",
      description: "AIに毎回背景情報を説明し直す手間",
    },
    {
      icon: FolderSync,
      title: "資料の手動管理が大変",
      description: "必要なファイルを毎回探してアップロード",
    },
  ];

  return (
    <section className="bg-white py-12 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            こんな課題、ありませんか？
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-600">
            番組制作現場でよくある悩みを解決します
          </p>
        </div>

        <div className="mt-10 sm:mt-16 grid gap-6 sm:gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {problems.map((problem) => (
            <div
              key={problem.title}
              className="group relative rounded-xl sm:rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50 p-6 sm:p-8 transition-all hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <problem.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg sm:text-xl font-semibold text-gray-900">
                {problem.title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600">{problem.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// SolutionSection - 解決策（中央揃え・モバイル対応）
// ============================================
export function SolutionSection() {
  const features = [
    {
      icon: Bot,
      title: "文脈を保持するAI",
      description: "番組・チーム単位でコンテキストを管理。毎回の説明が不要に。",
      image: "/images/lp/feature-research.png",
    },
    {
      icon: FolderSync,
      title: "Google Drive統合",
      description: "@メンションでドライブ内のファイルを直接参照。",
      image: "/images/lp/feature-drive.png",
    },
    {
      icon: Zap,
      title: "役割別エージェント",
      description: "リサーチ・企画・構成それぞれに最適化されたAI。",
      image: "/images/lp/feature-planning.png",
    },
  ];

  return (
    <section className="bg-gradient-to-b from-white to-blue-50 py-12 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
            <Zap className="h-4 w-4" />
            AD-Agentの特徴
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            スマートな解決策
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-600">
            既存のワークフローに自然に統合
          </p>
        </div>

        <div className="mt-10 sm:mt-16 space-y-12 sm:space-y-16 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`flex flex-col items-center gap-6 sm:gap-8 lg:flex-row ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              <div className="flex-1 space-y-4 text-center lg:text-left">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-base sm:text-lg text-gray-600">{feature.description}</p>
              </div>
              <div className="flex-1 w-full">
                <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white shadow-xl shadow-blue-100">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    width={600}
                    height={450}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// AgentTypesSection - エージェント種別（中央揃え・モバイル対応）
// ============================================
export function AgentTypesSection() {
  const agents = [
    {
      icon: Search,
      name: "リサーチ",
      description: "情報収集・調査資料作成",
      color: "from-blue-500 to-cyan-400",
      bgColor: "bg-blue-50",
    },
    {
      icon: Lightbulb,
      name: "ネタ探し",
      description: "トレンド・話題発掘",
      color: "from-orange-500 to-yellow-400",
      bgColor: "bg-orange-50",
    },
    {
      icon: Pencil,
      name: "企画作家",
      description: "企画立案・企画書作成",
      color: "from-purple-500 to-pink-400",
      bgColor: "bg-purple-50",
    },
    {
      icon: FileText,
      name: "構成作家",
      description: "台本・構成作成",
      color: "from-teal-500 to-green-400",
      bgColor: "bg-teal-50",
    },
  ];

  return (
    <section className="bg-white py-12 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            4つの専門エージェント
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-600">
            それぞれの作業に最適化されたAIアシスタント
          </p>
        </div>

        <div className="mt-10 sm:mt-16 grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className={`group relative overflow-hidden rounded-xl sm:rounded-2xl ${agent.bgColor} p-4 sm:p-6 transition-all hover:scale-105 hover:shadow-xl`}
            >
              <div
                className={`mb-3 sm:mb-4 inline-flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br ${agent.color} text-white shadow-lg`}
              >
                <agent.icon className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>
              <h3 className="mb-1 sm:mb-2 text-base sm:text-xl font-bold text-gray-900">
                {agent.name}
              </h3>
              <p className="text-xs sm:text-base text-gray-600">{agent.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// WorkflowSection - ワークフロー（中央揃え・モバイル対応）
// ============================================
export function WorkflowSection() {
  const steps = [
    { number: "01", title: "番組を作成", description: "Google Driveと連携" },
    { number: "02", title: "チームを設定", description: "エージェントを選択" },
    { number: "03", title: "チャットで指示", description: "@でファイル参照" },
    { number: "04", title: "成果物を出力", description: "Driveに自動保存" },
  ];

  return (
    <section className="bg-gradient-to-b from-blue-50 to-white py-12 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            かんたん4ステップ
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-600">
            すぐに使い始められます
          </p>
        </div>

        <div className="mt-10 sm:mt-16 max-w-4xl mx-auto">
          <div className="grid gap-6 sm:gap-4 grid-cols-2 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {/* 接続線 - デスクトップのみ */}
                {index < steps.length - 1 && (
                  <div className="absolute left-1/2 top-8 hidden h-0.5 w-full bg-gradient-to-r from-blue-300 to-cyan-300 md:block" />
                )}
                <div className="relative flex flex-col items-center text-center">
                  <div className="mb-3 sm:mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-base sm:text-xl font-bold text-white shadow-lg shadow-blue-500/25">
                    {step.number}
                  </div>
                  <h3 className="mb-1 text-sm sm:text-base font-semibold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* スクリプト機能画像 */}
        <div className="mt-12 sm:mt-16 flex justify-center px-4">
          <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white shadow-xl">
            <Image
              src="/images/lp/feature-script.png"
              alt="AD-Agent Workflow"
              width={800}
              height={600}
              className="w-full max-w-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// CTASection - アクション促進（中央揃え・モバイル対応）
// ============================================
export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 py-12 sm:py-20">
      {/* 背景パターン */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-white" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white" />
      </div>

      <div className="container mx-auto relative px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            今すぐ始めよう
          </h2>
          <p className="mt-4 text-base sm:text-lg text-white/90">
            番組制作の効率を劇的に向上させましょう
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              asChild
              className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg bg-white text-blue-600 hover:bg-blue-50 shadow-lg font-semibold"
            >
              <Link href="/auth/login">
                ログイン
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// PublicFooter（中央揃え・モバイル対応）
// ============================================
export function PublicFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">AD-Agent</span>
          </div>
          <p className="text-sm text-gray-500">
            &copy; 2024 AD-Agent. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
