"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  Settings,
  Brain,
  Database,
  Gauge,
  Palette,
  Shield,
  Save,
  RotateCcw,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  SettingItem,
  SettingCategory,
  SETTING_CATEGORIES,
  groupSettingsByCategory,
  SettingValue,
} from "@/lib/settings/types";

const categoryIcons: Record<SettingCategory, React.ReactNode> = {
  general: <Settings className="w-5 h-5" />,
  llm: <Brain className="w-5 h-5" />,
  cache: <Database className="w-5 h-5" />,
  rateLimit: <Gauge className="w-5 h-5" />,
  ui: <Palette className="w-5 h-5" />,
  security: <Shield className="w-5 h-5" />,
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [modifiedSettings, setModifiedSettings] = useState<Map<string, SettingValue>>(new Map());
  const [activeCategory, setActiveCategory] = useState<SettingCategory>("general");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  // 設定を読み込む
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 設定値を更新
  const handleSettingChange = (settingId: string, value: SettingValue) => {
    setModifiedSettings((prev) => {
      const newMap = new Map(prev);
      newMap.set(settingId, value);
      return newMap;
    });
    // エラーをクリア
    setErrors((prev) => {
      const newMap = new Map(prev);
      newMap.delete(settingId);
      return newMap;
    });
  };

  // 保存
  const handleSave = async () => {
    if (modifiedSettings.size === 0) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updates = Array.from(modifiedSettings.entries()).map(([id, value]) => ({
        id,
        value,
      }));

      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updates }),
      });

      const data = await response.json();

      if (data.success) {
        setSaveSuccess(true);
        setModifiedSettings(new Map());
        // 設定を再読み込み
        await loadSettings();
        setTimeout(() => setSaveSuccess(false), 3000);
      }

      if (data.errors) {
        const errorMap = new Map<string, string>();
        data.errors.forEach((err: { id: string; message: string }) => {
          errorMap.set(err.id, err.message);
        });
        setErrors(errorMap);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // デフォルトに戻す
  const handleReset = async () => {
    if (!confirm("すべての設定をデフォルトに戻しますか？この操作は元に戻せません。")) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
      });

      if (response.ok) {
        setModifiedSettings(new Map());
        await loadSettings();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to reset settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // 変更をキャンセル
  const handleCancel = () => {
    setModifiedSettings(new Map());
    setErrors(new Map());
  };

  // 現在の値を取得（変更されていれば変更後、なければ現在の設定値）
  const getCurrentValue = (setting: SettingItem): SettingValue => {
    return modifiedSettings.has(setting.id)
      ? modifiedSettings.get(setting.id)!
      : setting.value;
  };

  // 設定が変更されているか
  const isModified = (settingId: string): boolean => {
    return modifiedSettings.has(settingId);
  };

  // カテゴリ別にグループ化
  const groupedSettings = groupSettingsByCategory(settings);
  const currentCategorySettings = groupedSettings[activeCategory] || [];

  // 設定入力コンポーネント
  const SettingInput = ({ setting }: { setting: SettingItem }) => {
    const value = getCurrentValue(setting);
    const error = errors.get(setting.id);
    const modified = isModified(setting.id);

    switch (setting.type) {
      case "string":
        return (
          <div className="space-y-2">
            <Input
              type={setting.secret ? "password" : "text"}
              value={String(value)}
              onChange={(e) => handleSettingChange(setting.id, e.target.value)}
              className={cn(
                "max-w-md",
                modified && "border-blue-500",
                error && "border-red-500"
              )}
              disabled={setting.readOnly}
            />
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div className="space-y-2">
            <Textarea
              value={String(value)}
              onChange={(e) => handleSettingChange(setting.id, e.target.value)}
              className={cn(
                "max-w-md min-h-[100px]",
                modified && "border-blue-500",
                error && "border-red-500"
              )}
              disabled={setting.readOnly}
            />
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      case "number":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={Number(value)}
                onChange={(e) => handleSettingChange(setting.id, Number(e.target.value))}
                min={setting.min}
                max={setting.max}
                step={setting.step}
                className={cn(
                  "w-32",
                  modified && "border-blue-500",
                  error && "border-red-500"
                )}
                disabled={setting.readOnly}
              />
              <span className="text-sm text-gray-500">
                {setting.min !== undefined && setting.max !== undefined
                  ? `${setting.min} - ${setting.max}`
                  : ""}
              </span>
            </div>
            {setting.min !== undefined && setting.max !== undefined && (
              <Slider
                value={[Number(value)]}
                onValueChange={([v]) => handleSettingChange(setting.id, v)}
                min={setting.min}
                max={setting.max}
                step={setting.step || 1}
                className="max-w-md"
                disabled={setting.readOnly}
              />
            )}
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      case "boolean":
        return (
          <div className="space-y-2">
            <Switch
              checked={Boolean(value)}
              onCheckedChange={(checked) => handleSettingChange(setting.id, checked)}
              disabled={setting.readOnly}
            />
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      case "select":
        return (
          <div className="space-y-2">
            <Select
              value={String(value)}
              onValueChange={(v) => handleSettingChange(setting.id, v)}
              disabled={setting.readOnly}
            >
              <SelectTrigger className={cn("max-w-md", modified && "border-blue-500")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {setting.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex h-full bg-gray-50">
      {/* 左側: カテゴリ一覧 */}
      <aside className="w-64 border-r border-gray-200 bg-white flex-shrink-0">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            設定カテゴリ
          </h2>
          <nav className="space-y-1">
            {SETTING_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                  activeCategory === category.id
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <span className={cn(
                  "flex-shrink-0",
                  activeCategory === category.id ? "text-white" : "text-gray-500"
                )}>
                  {categoryIcons[category.id]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{category.label}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {groupedSettings[category.id]?.length || 0} 項目
                  </p>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* 右側: 設定詳細 */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {SETTING_CATEGORIES.find((c) => c.id === activeCategory)?.label}
              </h1>
              <p className="text-gray-500 mt-1">
                {SETTING_CATEGORIES.find((c) => c.id === activeCategory)?.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {modifiedSettings.size > 0 && (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        保存中...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        保存完了
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        保存
                        {modifiedSettings.size > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {modifiedSettings.size}
                          </Badge>
                        )}
                      </>
                    )}
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" onClick={handleReset} title="デフォルトに戻す">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* 設定リスト */}
          <div className="space-y-6">
            {currentCategorySettings.map((setting) => (
              <Card
                key={setting.id}
                className={cn(
                  "transition-colors bg-white border-gray-200",
                  isModified(setting.id) && "border-amber-500 bg-amber-500/10"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-medium flex items-center gap-2 text-gray-900">
                        {setting.label}
                        {setting.required && (
                          <Badge variant="destructive" className="text-xs">
                            必須
                          </Badge>
                        )}
                        {setting.readOnly && (
                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                            読取専用
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1.5 text-gray-500">
                        {setting.description}
                      </CardDescription>
                    </div>
                    {isModified(setting.id) && (
                      <Badge variant="outline" className="text-amber-500 border-amber-500/50 bg-amber-500/10">
                        変更あり
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <SettingInput setting={setting} />
                  <div className="mt-3 text-xs text-gray-500">
                    デフォルト値: {" "}
                    {setting.secret
                      ? "********"
                      : typeof setting.defaultValue === "boolean"
                      ? setting.defaultValue
                        ? "有効"
                        : "無効"
                      : String(setting.defaultValue)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  </AdminLayout>
  );
}
