"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Download, FileText, FileSpreadsheet, ChevronDown, Check, AlertCircle } from "lucide-react";
import { exportData, ExportOptions, ExportResult } from "@/lib/export";

export type ExportFormat = "markdown" | "csv";

interface ExportButtonProps {
  data: string;
  filename?: string;
  className?: string;
  onExportStart?: () => void;
  onExportComplete?: (result: ExportResult) => void;
}

interface ExportOption {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
}

const exportOptions: ExportOption[] = [
  {
    id: "markdown",
    label: "Markdown",
    description: "マークダウン形式でエクスポート",
    icon: <FileText className="w-4 h-4" />,
    extension: ".md",
  },
  {
    id: "csv",
    label: "CSV",
    description: "スプレッドシート形式でエクスポート",
    icon: <FileSpreadsheet className="w-4 h-4" />,
    extension: ".csv",
  },
];

export function ExportButton({
  data,
  filename,
  className,
  onExportStart,
  onExportComplete,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    show: boolean;
    success: boolean;
    message: string;
  }>({ show: false, success: true, message: "" });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ステータスメッセージを自動的に消す
  useEffect(() => {
    if (exportStatus.show) {
      const timer = setTimeout(() => {
        setExportStatus((prev) => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [exportStatus.show]);

  const handleExport = async (format: ExportFormat) => {
    setIsOpen(false);
    setIsExporting(true);
    onExportStart?.();

    const options: ExportOptions = {
      format,
      filename,
      data,
    };

    const result = exportData(options);

    setIsExporting(false);
    onExportComplete?.(result);

    if (result.success) {
      setExportStatus({
        show: true,
        success: true,
        message: `エクスポートが完了しました`,
      });
    } else {
      setExportStatus({
        show: true,
        success: false,
        message: result.error || "エクスポートに失敗しました",
      });
    }
  };

  return (
    <div ref={dropdownRef} className={cn("relative inline-block", className)}>
      {/* メインボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg",
          "bg-white border border-gray-200",
          "hover:border-orange-500/50 transition-all duration-200",
          "text-sm text-gray-700",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isOpen && "border-orange-500/50"
        )}
      >
        <Download
          className={cn(
            "w-4 h-4 transition-transform",
            isExporting && "animate-bounce"
          )}
        />
        <span className="font-medium">エクスポート</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-500 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* メニュー */}
          <div
            className={cn(
              "absolute top-full right-0 mt-2 z-50",
              "w-64 rounded-xl",
              "bg-white border border-gray-200",
              "shadow-xl shadow-gray-200/50",
              "overflow-hidden",
              "animate-in fade-in zoom-in-95 duration-100"
            )}
          >
            {/* ヘッダー */}
            <div className="px-3 py-2 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                エクスポート形式
              </span>
            </div>

            {/* オプションリスト */}
            <div className="p-1">
              {exportOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleExport(option.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-3 rounded-lg",
                    "hover:bg-gray-100 transition-colors",
                    "text-left group"
                  )}
                >
                  <div
                    className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                      "bg-gray-100 group-hover:bg-gray-200 transition-colors",
                      option.id === "markdown" && "text-blue-500",
                      option.id === "csv" && "text-green-500"
                    )}
                  >
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 font-medium">
                        {option.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {option.extension}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {option.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ステータス通知 */}
      {exportStatus.show && (
        <div
          className={cn(
            "absolute top-full right-0 mt-2 z-50",
            "flex items-center gap-2 px-3 py-2 rounded-lg",
            "text-sm animate-in fade-in slide-in-from-top-2",
            exportStatus.success
              ? "bg-green-50 border border-green-200 text-green-600"
              : "bg-red-50 border border-red-200 text-red-600"
          )}
        >
          {exportStatus.success ? (
            <Check className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{exportStatus.message}</span>
        </div>
      )}
    </div>
  );
}

/**
 * シンプルなエクスポートボタン（ドロップダウンなし）
 */
interface SimpleExportButtonProps {
  data: string;
  format: ExportFormat;
  filename?: string;
  className?: string;
  onExportComplete?: (result: ExportResult) => void;
}

export function SimpleExportButton({
  data,
  format,
  filename,
  className,
  onExportComplete,
}: SimpleExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);

    const options: ExportOptions = {
      format,
      filename,
      data,
    };

    const result = exportData(options);
    setIsExporting(false);
    onExportComplete?.(result);
  };

  const option = exportOptions.find((o) => o.id === format);

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-white border border-gray-200",
        "hover:border-orange-500/50 transition-all duration-200",
        "text-sm text-gray-700",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      <Download
        className={cn(
          "w-4 h-4 transition-transform",
          isExporting && "animate-bounce"
        )}
      />
      <span className="font-medium">{option?.label || "エクスポート"}</span>
    </button>
  );
}

export default ExportButton;
