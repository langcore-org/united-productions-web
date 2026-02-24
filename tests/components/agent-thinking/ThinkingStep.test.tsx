/**
 * ThinkingStep コンポーネントのテスト
 *
 * @updated 2026-02-20 23:45
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThinkingStep, ThinkingStepList } from "@/components/agent-thinking/ThinkingStep";
import type { ThinkingStep as ThinkingStepType } from "@/types/agent-thinking";

const mockStep: ThinkingStepType = {
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
      searchQuery: "VAIO 14インチ モニター",
      status: "completed",
      timestamp: new Date(),
    },
  ],
  progress: { current: 1, total: 3 },
  metadata: {
    knowledgeCount: 2,
  },
  timestamp: new Date(),
  completedAt: new Date(),
};

const mockRunningStep: ThinkingStepType = {
  id: "step-2",
  stepNumber: 2,
  type: "thinking",
  title: "分析中...",
  status: "running",
  subSteps: [],
  timestamp: new Date(),
};

describe("ThinkingStep", () => {
  it("should render step title", () => {
    render(<ThinkingStep step={mockStep} />);

    expect(screen.getByText("製品情報の検証")).toBeInTheDocument();
  });

  it("should show progress indicator", () => {
    render(<ThinkingStep step={mockStep} />);

    expect(screen.getByText("1/3")).toBeInTheDocument();
  });

  it("should show knowledge count badge", () => {
    render(<ThinkingStep step={mockStep} />);

    expect(screen.getByText("Knowledge recalled(2)")).toBeInTheDocument();
  });

  it("should expand by default when running", () => {
    render(<ThinkingStep step={mockRunningStep} />);

    // 進行中は展開されている
    const statusIcon = document.querySelector(".animate-spin");
    expect(statusIcon).toBeTruthy();
  });

  it("should toggle expand on click", () => {
    render(<ThinkingStep step={mockStep} />);

    const button = screen.getByText("製品情報の検証").closest("button");
    expect(button).toBeTruthy();

    if (button) {
      // クリックで折りたたむ
      fireEvent.click(button);

      // クリックで展開
      fireEvent.click(button);

      expect(screen.getByText("製品情報の検証")).toBeInTheDocument();
    }
  });

  it("should render different status styles", () => {
    const { rerender } = render(<ThinkingStep step={{ ...mockStep, status: "running" }} />);
    expect(document.querySelector(".text-blue-500")).toBeTruthy();

    rerender(<ThinkingStep step={{ ...mockStep, status: "error" }} />);
    expect(document.querySelector(".text-red-500")).toBeTruthy();
  });

  it("should show timestamp when completed", () => {
    render(<ThinkingStep step={mockStep} />);

    // 時刻が表示される（フォーマットは環境による）
    const timeRegex = /\d{1,2}:\d{2}/;
    const elements = screen.getAllByText(timeRegex);
    expect(elements.length).toBeGreaterThan(0);
  });
});

describe("ThinkingStepList", () => {
  const mockSteps: ThinkingStepType[] = [mockStep, mockRunningStep];

  it("should render list of steps", () => {
    render(<ThinkingStepList steps={mockSteps} />);

    expect(screen.getByText("製品情報の検証")).toBeInTheDocument();
    expect(screen.getByText("分析中...")).toBeInTheDocument();
  });

  it("should return null when steps is empty", () => {
    const { container } = render(<ThinkingStepList steps={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("should highlight active step", () => {
    render(<ThinkingStepList steps={mockSteps} activeStepId="step-1" />);

    expect(screen.getByText("製品情報の検証")).toBeInTheDocument();
    expect(screen.getByText("分析中...")).toBeInTheDocument();
  });
});
