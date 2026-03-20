import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";

import { ChatInputArea } from "@/components/ui/ChatInputArea";
import type { AttachedFile } from "@/components/ui/FileAttachment";
import { FileAttachButton } from "@/components/ui/FileAttachment";

describe("chat attachment validation UX", () => {
  it("content: null の添付があると読み込み不可通知が出る", () => {
    const files: AttachedFile[] = [
      { id: "f1", name: "a.pdf", type: "application/pdf", size: 123, content: null },
    ];

    render(
      <ChatInputArea
        input=""
        onInputChange={vi.fn()}
        attachedFiles={files}
        onFilesChange={vi.fn()}
        isStreaming={false}
        onSend={vi.fn()}
        enableFileAttachment
      />,
    );

    expect(screen.getByText("この形式は現在読み込めません。今後対応予定です。")).toBeInTheDocument();
  });

  it("FileAttachButton: 最大件数超過はエラーを出す（添付は増えない）", async () => {
    const onFilesSelect = vi.fn();
    const onError = vi.fn();

    const { container } = render(
      <FileAttachButton
        onFilesSelect={onFilesSelect}
        disabled={false}
        existingCount={4}
        maxFiles={5}
        maxSizeMB={10}
        onError={onError}
      />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    if (!input) return;

    const f1 = new File([new ArrayBuffer(10)], "b.pdf", { type: "application/pdf" });
    const f2 = new File([new ArrayBuffer(10)], "c.pdf", { type: "application/pdf" });

    await fireEvent.change(input, { target: { files: [f1, f2] } });

    expect(onError).toHaveBeenCalledWith("最大5ファイルまで添付できます");
    expect(onFilesSelect).not.toHaveBeenCalled();
  });

  it("ChatInputArea: 添付エラーは添付が空になったらクリアされる", () => {
    const initialFiles: AttachedFile[] = [
      { id: "f1", name: "a.pdf", type: "application/pdf", size: 1, content: null },
      { id: "f2", name: "b.pdf", type: "application/pdf", size: 1, content: null },
      { id: "f3", name: "c.pdf", type: "application/pdf", size: 1, content: null },
      { id: "f4", name: "d.pdf", type: "application/pdf", size: 1, content: null },
    ];

    const onInputChange = vi.fn();
    const onFilesChange = vi.fn();

    const { container, rerender } = render(
      <ChatInputArea
        input=""
        onInputChange={onInputChange}
        attachedFiles={initialFiles}
        onFilesChange={onFilesChange}
        isStreaming={false}
        onSend={vi.fn()}
        enableFileAttachment
      />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    if (!input) return;

    const f1 = new File([new ArrayBuffer(10)], "x.pdf", { type: "application/pdf" });
    const f2 = new File([new ArrayBuffer(10)], "y.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [f1, f2] } });

    // 最大件数（existingCount=4 + 2 > 5）
    expect(screen.getByText("最大5ファイルまで添付できます")).toBeInTheDocument();

    // 送信後などで添付が空になる
    rerender(
      <ChatInputArea
        input=""
        onInputChange={onInputChange}
        attachedFiles={[]}
        onFilesChange={onFilesChange}
        isStreaming={false}
        onSend={vi.fn()}
        enableFileAttachment
      />,
    );

    expect(screen.queryByText("最大5ファイルまで添付できます")).not.toBeInTheDocument();
  });
});

