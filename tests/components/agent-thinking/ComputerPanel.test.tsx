/**
 * ComputerPanel コンポーネントのテスト
 * 
 * @updated 2026-02-20 23:55
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ComputerPanel,
  ComputerPanelToggle,
  ComputerPanelOverlay,
  SearchResultCard,
} from "@/components/agent-thinking/ComputerPanel";
import type { SearchResultItem, SubStep } from "@/types/agent-thinking";

const mockSearchResult: SearchResultItem = {
  id: "result-1",
  title: "LG gram 14 Lightweight Laptop",
  description: "14 Inch Lightweight Laptop, Intel 12th Gen Core i7",
  url: "https://example.com/lg-gram",
  source: "Example Store",
};

const mockSubStep: SubStep = {
  id: "sub-1",
  type: "search",
  label: "検索",
  searchQuery: "LG Gram 14インチ 重量",
  status: "running",
  timestamp: new Date(),
};

describe("SearchResultCard", () => {
  it("should render result title and description", () => {
    render(<SearchResultCard result={mockSearchResult} />);

    expect(screen.getByText("LG gram 14 Lightweight Laptop")).toBeInTheDocument();
    expect(screen.getByText(/Intel 12th Gen Core i7/)).toBeInTheDocument();
  });

  it("should show domain", () => {
    render(<SearchResultCard result={mockSearchResult} />);

    expect(screen.getByText("example.com")).toBeInTheDocument();
  });

  it("should call onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<SearchResultCard result={mockSearchResult} onClick={handleClick} />);

    const card = screen.getByText("LG gram 14 Lightweight Laptop").closest("div")?.parentElement;
    if (card) {
      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalledWith(mockSearchResult);
    }
  });

  it("should render with unknown source when no URL", () => {
    const resultWithoutUrl = { ...mockSearchResult, url: "", source: undefined };
    render(<SearchResultCard result={resultWithoutUrl} />);

    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});

describe("ComputerPanel", () => {
  const mockOnClose = vi.fn();

  it("should not render when isOpen is false", () => {
    const { container } = render(
      <ComputerPanel
        isOpen={false}
        onClose={mockOnClose}
        searchResults={[]}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("should render when isOpen is true", () => {
    render(
      <ComputerPanel
        isOpen={true}
        onClose={mockOnClose}
        searchResults={[]}
      />
    );

    expect(screen.getByText("Computer")).toBeInTheDocument();
  });

  it("should show empty state when no results", () => {
    render(
      <ComputerPanel
        isOpen={true}
        onClose={mockOnClose}
        searchResults={[]}
      />
    );

    expect(screen.getByText("検索結果がありません")).toBeInTheDocument();
  });

  it("should render search results", () => {
    render(
      <ComputerPanel
        isOpen={true}
        onClose={mockOnClose}
        searchResults={[mockSearchResult]}
      />
    );

    expect(screen.getByText("LG gram 14 Lightweight Laptop")).toBeInTheDocument();
  });

  it("should show active sub step info", () => {
    render(
      <ComputerPanel
        isOpen={true}
        onClose={mockOnClose}
        searchResults={[]}
        activeSubStep={mockSubStep}
      />
    );

    expect(screen.getByText("実行中の検索")).toBeInTheDocument();
    expect(screen.getByText("LG Gram 14インチ 重量")).toBeInTheDocument();
  });

  it("should call onClose when close button is clicked", () => {
    render(
      <ComputerPanel
        isOpen={true}
        onClose={mockOnClose}
        searchResults={[]}
      />
    );

    const closeButton = screen.getByLabelText("閉じる");
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should show result count in footer", () => {
    render(
      <ComputerPanel
        isOpen={true}
        onClose={mockOnClose}
        searchResults={[mockSearchResult, mockSearchResult]}
      />
    );

    expect(screen.getByText("2件の結果")).toBeInTheDocument();
  });
});

describe("ComputerPanelToggle", () => {
  it("should render toggle button", () => {
    const handleClick = vi.fn();
    render(<ComputerPanelToggle isOpen={false} onClick={handleClick} />);

    expect(screen.getByText("Computer")).toBeInTheDocument();
  });

  it("should show unread count", () => {
    const handleClick = vi.fn();
    render(
      <ComputerPanelToggle isOpen={false} onClick={handleClick} unreadCount={5} />
    );

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should call onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<ComputerPanelToggle isOpen={false} onClick={handleClick} />);

    const button = screen.getByText("Computer").closest("button");
    if (button) {
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalled();
    }
  });

  it("should be hidden when panel is open", () => {
    const handleClick = vi.fn();
    const { container } = render(
      <ComputerPanelToggle isOpen={true} onClick={handleClick} />
    );

    const button = container.querySelector("button");
    expect(button?.className).toContain("opacity-0");
  });
});

describe("ComputerPanelOverlay", () => {
  it("should render when isOpen is true", () => {
    const { container } = render(
      <ComputerPanelOverlay isOpen={true} onClose={vi.fn()} />
    );

    expect(container.firstChild).toBeTruthy();
  });

  it("should not render when isOpen is false", () => {
    const { container } = render(
      <ComputerPanelOverlay isOpen={false} onClose={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("should call onClose when clicked", () => {
    const handleClose = vi.fn();
    const { container } = render(
      <ComputerPanelOverlay isOpen={true} onClose={handleClose} />
    );

    const overlay = container.firstChild;
    if (overlay) {
      fireEvent.click(overlay as Element);
      expect(handleClose).toHaveBeenCalled();
    }
  });
});
