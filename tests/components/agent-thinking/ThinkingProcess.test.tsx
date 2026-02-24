/**
 * ThinkingProcess コンポーネントのテスト
 *
 * @updated 2026-02-20 23:58
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  SimpleThinkingProcess,
  ThinkingProcess,
} from "@/components/agent-thinking/ThinkingProcess";
import type { ThinkingStep } from "@/types/agent-thinking";

const mockSteps: ThinkingStep[] = [
  {
    id: "step-1",
    stepNumber: 1,
    type: "search",
    title: "製品情報の検証",
    content: "提供された製品情報を検証しています...",
    status: "completed",
    subSteps: [
      {
        id: "sub-1",
        type: "search",
        label: "検索",
        searchQuery: "VAIO 14インチ",
        status: "completed",
        timestamp: new Date(),
      },
    ],
    timestamp: new Date(),
    completedAt: new Date(),
  },
  {
    id: "step-2",
    stepNumber: 2,
    type: "thinking",
    title: "分析中...",
    status: "running",
    subSteps: [],
    timestamp: new Date(),
  },
];

describe("ThinkingProcess", () => {
  it("should render step list", () => {
    render(<ThinkingProcess steps={mockSteps} />);

    expect(screen.getByText("製品情報の検証")).toBeInTheDocument();
    expect(screen.getByText("分析中...")).toBeInTheDocument();
  });

  it("should show Teddy header", () => {
    render(<ThinkingProcess steps={mockSteps} />);

    expect(screen.getByText("Teddy")).toBeInTheDocument();
  });

  it("should show running status", () => {
    render(<ThinkingProcess steps={mockSteps} overallStatus="running" />);

    expect(screen.getByText("思考中...")).toBeInTheDocument();
  });

  it("should show completion count when completed", () => {
    const completedSteps = mockSteps.map((s) => ({ ...s, status: "completed" as const }));
    render(<ThinkingProcess steps={completedSteps} overallStatus="completed" />);

    expect(screen.getByText("2/2 ステップ完了")).toBeInTheDocument();
  });

  it("should render with empty steps", () => {
    render(<ThinkingProcess steps={[]} />);

    expect(screen.getByText("Teddy")).toBeInTheDocument();
  });

  it("should auto-activate running step", () => {
    render(<ThinkingProcess steps={mockSteps} />);

    // 進行中のステップがアクティブになる
    const runningStep = screen.getByText("分析中...");
    expect(runningStep).toBeInTheDocument();
  });
});

describe("SimpleThinkingProcess", () => {
  it("should render text content", () => {
    render(<SimpleThinkingProcess text="シンプルな思考プロセス" />);

    expect(screen.getByText("シンプルな思考プロセス")).toBeInTheDocument();
  });

  it("should show complete state", () => {
    render(<SimpleThinkingProcess text="完了" isComplete={true} />);

    expect(screen.getByText("完了")).toBeInTheDocument();
  });

  it("should show running state", () => {
    render(<SimpleThinkingProcess text="実行中" isComplete={false} />);

    expect(screen.getByText("実行中")).toBeInTheDocument();
  });
});
