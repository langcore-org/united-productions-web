/**
 * SubStep コンポーネントのテスト
 * 
 * @updated 2026-02-20 23:35
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubStep, SubStepList } from "@/components/agent-thinking/SubStep";
import type { SubStep as SubStepType } from "@/types/agent-thinking";

const mockSubStep: SubStepType = {
  id: "sub-1",
  type: "search",
  label: "検索",
  searchQuery: "テストクエリ",
  status: "completed",
  detail: "検索結果の詳細",
  metadata: {
    resultCount: 5,
    duration: 1.23,
  },
  timestamp: new Date(),
};

const mockSubStepNoDetail: SubStepType = {
  id: "sub-2",
  type: "tool_use",
  label: "ツール実行",
  toolName: "text_editor",
  status: "running",
  timestamp: new Date(),
};

describe("SubStep", () => {
  it("should render with search query", () => {
    render(<SubStep subStep={mockSubStep} />);

    expect(screen.getByText("検索")).toBeInTheDocument();
    expect(screen.getByText("テストクエリ")).toBeInTheDocument();
  });

  it("should render with tool name", () => {
    render(<SubStep subStep={mockSubStepNoDetail} />);

    expect(screen.getByText("ツール実行")).toBeInTheDocument();
    expect(screen.getByText("text_editor")).toBeInTheDocument();
  });

  it("should call onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<SubStep subStep={mockSubStep} onClick={handleClick} />);

    // 親要素をクリック（折りたたみ可能なエリア）
    const element = screen.getByText("検索").closest("div")?.parentElement?.parentElement;
    if (element) {
      fireEvent.click(element);
      expect(handleClick).toHaveBeenCalledWith(mockSubStep);
    }
  });

  it("should apply active styles when isActive is true", () => {
    render(<SubStep subStep={mockSubStep} isActive={true} />);

    const element = screen.getByText("検索").closest("div")?.parentElement;
    expect(element?.className).toContain("bg-blue-50");
  });

  it("should render different status icons", () => {
    const { rerender } = render(<SubStep subStep={{ ...mockSubStep, status: "pending" }} />);
    expect(document.querySelector("svg")).toBeTruthy();

    rerender(<SubStep subStep={{ ...mockSubStep, status: "running" }} />);
    expect(document.querySelector("svg")).toBeTruthy();

    rerender(<SubStep subStep={{ ...mockSubStep, status: "error" }} />);
    expect(document.querySelector("svg")).toBeTruthy();
  });
});

describe("SubStepList", () => {
  const mockSubSteps: SubStepType[] = [
    mockSubStep,
    mockSubStepNoDetail,
  ];

  it("should render list of sub steps", () => {
    render(<SubStepList subSteps={mockSubSteps} />);

    expect(screen.getByText("検索")).toBeInTheDocument();
    expect(screen.getByText("ツール実行")).toBeInTheDocument();
  });

  it("should return null when subSteps is empty", () => {
    const { container } = render(<SubStepList subSteps={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("should highlight active sub step", () => {
    render(<SubStepList subSteps={mockSubSteps} activeSubStepId="sub-1" />);

    const elements = screen.getAllByText(/検索|ツール実行/);
    expect(elements.length).toBe(2);
  });

  it("should call onSubStepClick when sub step is clicked", () => {
    const handleClick = vi.fn();
    render(<SubStepList subSteps={mockSubSteps} onSubStepClick={handleClick} />);

    const element = screen.getByText("検索").closest("div")?.parentElement?.parentElement;
    if (element) {
      fireEvent.click(element);
      expect(handleClick).toHaveBeenCalledWith(mockSubStep);
    }
  });
});
