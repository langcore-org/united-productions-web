"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";

import {
  User,
  Camera,
  Bell,
  Database,
  Download,
  Trash2,
  AlertTriangle,
  Check,
  X,
  Mail,
  MessageSquare,
  Save,
  Search,
  Bot,
} from "lucide-react";

// ============================================
// Types
// ============================================
interface ProfileData {
  displayName: string;
  email: string;
  avatar: string | null;
}

interface NotificationSettings {
  email: {
    enabled: boolean;
    meetingNotes: boolean;
    transcripts: boolean;
    research: boolean;
  };
  push: {
    enabled: boolean;
    meetingNotes: boolean;
    transcripts: boolean;
    research: boolean;
  };
}

interface GrokToolSettings {
  generalChat: boolean;
  researchCast: boolean;
  researchLocation: boolean;
  researchInfo: boolean;
  researchEvidence: boolean;
  minutes: boolean;
  proposal: boolean;
  naScript: boolean;
}

// ============================================
// Components
// ============================================

/**
 * Settings Section Card Component
 */
interface SettingsCardProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function SettingsCard({
  title,
  description,
  icon,
  children,
  className,
}: SettingsCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-xl overflow-hidden",
        className
      )}
    >
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-black/10 flex items-center justify-center">
            <span className="text-black">{icon}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/**
 * Toggle Switch Component
 */
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
}

function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        {label && <p className="text-sm font-medium text-gray-800">{label}</p>}
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors duration-200",
          checked ? "bg-black" : "bg-gray-200"
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

/**
 * Profile Settings Section
 */
function ProfileSection() {
  const [profile, setProfile] = useState<ProfileData>({
    displayName: "山田太郎",
    email: "yamada@united-productions.jp",
    avatar: null,
  });
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <SettingsCard
      title="プロフィール"
      description="表示名とアバターを設定します"
      icon={<User className="w-5 h-5" />}
    >
      <div className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div
            onClick={handleAvatarClick}
            className={cn(
              "relative w-20 h-20 rounded-full overflow-hidden cursor-pointer",
              "bg-gray-100 border-2 border-gray-200",
              "hover:border-black/50 transition-colors"
            )}
          >
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-8 h-8 text-gray-500" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div>
            <p className="text-sm font-medium text-gray-800">プロフィール画像</p>
            <p className="text-xs text-gray-500 mt-0.5">
              JPG、PNG、GIF形式（最大2MB）
            </p>
            <button
              onClick={handleAvatarClick}
              className="text-sm text-black hover:underline mt-2"
            >
              画像を変更
            </button>
          </div>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">表示名</label>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, displayName: e.target.value }))
                }
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg",
                  "bg-gray-50 border border-gray-200",
                  "text-gray-900 text-sm",
                  "focus:outline-none focus:border-black/50"
                )}
              />
              <button
                onClick={handleSave}
                className="p-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-800">{profile.displayName}</span>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-black hover:underline"
              >
                編集
              </button>
            </div>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">メールアドレス</label>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
            <Mail className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">{profile.email}</span>
          </div>
          <p className="text-xs text-gray-500">
            メールアドレスは管理者のみが変更できます
          </p>
        </div>
      </div>
    </SettingsCard>
  );
}

/**
 * Notification Settings Section
 */
function NotificationSection() {
  const [settings, setSettings] = useState<NotificationSettings>({
    email: {
      enabled: true,
      meetingNotes: true,
      transcripts: true,
      research: false,
      // schedules: true, // 削除
    },
    push: {
      enabled: true,
      meetingNotes: true,
      transcripts: false,
      research: true,
      // schedules: true, // 削除
    },
  });

  const updateEmailSetting = (
    key: keyof NotificationSettings["email"],
    value: boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      email: { ...prev.email, [key]: value },
    }));
  };

  const updatePushSetting = (
    key: keyof NotificationSettings["push"],
    value: boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      push: { ...prev.push, [key]: value },
    }));
  };

  return (
    <SettingsCard
      title="通知設定"
      description="メールとプッシュ通知の設定を管理します"
      icon={<Bell className="w-5 h-5" />}
    >
      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
            <Mail className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              メール通知
            </span>
          </div>
          <Toggle
            checked={settings.email.enabled}
            onChange={(checked) => updateEmailSetting("enabled", checked)}
            label="メール通知を有効にする"
            description="重要な更新をメールで受け取ります"
          />
          {settings.email.enabled && (
            <div className="pl-4 space-y-3 border-l-2 border-gray-200">
              <Toggle
                checked={settings.email.meetingNotes}
                onChange={(checked) =>
                  updateEmailSetting("meetingNotes", checked)
                }
                label="議事録・文字起こし"
              />
              <Toggle
                checked={settings.email.transcripts}
                onChange={(checked) =>
                  updateEmailSetting("transcripts", checked)
                }
                label="起こし・NA原稿"
              />
              <Toggle
                checked={settings.email.research}
                onChange={(checked) =>
                  updateEmailSetting("research", checked)
                }
                label="リサーチ・考査"
              />
              {/* ロケスケ設定は削除 */}
            </div>
          )}
        </div>

        {/* Push Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
            <MessageSquare className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              プッシュ通知
            </span>
          </div>
          <Toggle
            checked={settings.push.enabled}
            onChange={(checked) => updatePushSetting("enabled", checked)}
            label="プッシュ通知を有効にする"
            description="ブラウザでプッシュ通知を受け取ります"
          />
          {settings.push.enabled && (
            <div className="pl-4 space-y-3 border-l-2 border-gray-200">
              <Toggle
                checked={settings.push.meetingNotes}
                onChange={(checked) =>
                  updatePushSetting("meetingNotes", checked)
                }
                label="議事録・文字起こし"
              />
              <Toggle
                checked={settings.push.transcripts}
                onChange={(checked) =>
                  updatePushSetting("transcripts", checked)
                }
                label="起こし・NA原稿"
              />
              <Toggle
                checked={settings.push.research}
                onChange={(checked) =>
                  updatePushSetting("research", checked)
                }
                label="リサーチ・考査"
              />
              {/* ロケスケ設定は削除 */}
            </div>
          )}
        </div>
      </div>
    </SettingsCard>
  );
}

/**
 * Grok Tool Settings Section
 */
function GrokToolSection() {
  const [settings, setSettings] = useState<GrokToolSettings>({
    generalChat: false,
    researchCast: false,
    researchLocation: false,
    researchInfo: true,
    researchEvidence: true,
    minutes: false,
    proposal: false,
    naScript: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // 設定を取得
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings/grok-tools");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch Grok tool settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (key: keyof GrokToolSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const response = await fetch("/api/settings/grok-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaveMessage("保存しました");
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage("保存に失敗しました");
      }
    } catch (error) {
      console.error("Failed to save Grok tool settings:", error);
      setSaveMessage("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const toolItems = [
    { key: "generalChat" as const, label: "一般チャット", description: "通常のチャットでのWeb検索" },
    { key: "researchCast" as const, label: "出演者リサーチ", description: "出演者候補調査でのWeb検索" },
    { key: "researchLocation" as const, label: "場所リサーチ", description: "ロケ地調査でのWeb検索" },
    { key: "researchInfo" as const, label: "情報リサーチ", description: "情報収集でのWeb検索（推奨）" },
    { key: "researchEvidence" as const, label: "エビデンスリサーチ", description: "事実確認でのWeb検索（推奨）" },
    { key: "minutes" as const, label: "議事録作成", description: "議事録作成でのWeb検索" },
    { key: "proposal" as const, label: "新企画立案", description: "企画提案でのWeb検索" },
    { key: "naScript" as const, label: "NA原稿作成", description: "NA原稿作成でのWeb検索" },
  ];

  return (
    <SettingsCard
      title="Grokツール設定"
      description="機能別のWeb検索（X Search）有効化設定"
      icon={<Bot className="w-5 h-5" />}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-100 border border-gray-200">
              <Search className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Web検索ツールについて
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Grokモデル使用時に、各機能でWeb検索を有効にすると、
                  最新情報をリアルタイムで検索して回答に含めることができます。
                  検索が必要な機能（情報リサーチ・エビデンス検索など）ではデフォルトで有効になっています。
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-700">
                  機能別設定
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {toolItems.map((item) => (
                  <Toggle
                    key={item.key}
                    checked={settings[item.key]}
                    onChange={(checked) => updateSetting(item.key, checked)}
                    label={item.label}
                    description={item.description}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div>
                {saveMessage && (
                  <span className={cn(
                    "text-sm",
                    saveMessage === "保存しました" ? "text-gray-700" : "text-gray-600"
                  )}>
                    {saveMessage}
                  </span>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                  "bg-black text-white",
                  "hover:bg-gray-800 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    設定を保存
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </SettingsCard>
  );
}

/**
 * Data Management Section
 */
function DataManagementSection() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleExport = (type: "all" | "meeting-notes" | "transcripts" | "research") => {
    console.log(`Exporting ${type}...`);
  };

  const handleDelete = () => {
    if (deleteConfirmText === "削除") {
      console.log("Deleting all data...");
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    }
  };

  return (
    <SettingsCard
      title="データ管理"
      description="データのエクスポートと削除を管理します"
      icon={<Database className="w-5 h-5" />}
    >
      <div className="space-y-6">
        {/* Export Data */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
            <Download className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">データエクスポート</span>
          </div>
          <p className="text-sm text-gray-500">
            作成したデータをJSON形式でエクスポートできます
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "all", label: "すべてのデータ" },
              { id: "meeting-notes", label: "議事録・文字起こし" },
              { id: "transcripts", label: "起こし・NA原稿" },
              { id: "research", label: "リサーチ・考査" },
              // { id: "schedules", label: "ロケスケ管理" }, // 削除
            ].map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  handleExport(
                    item.id as "all" | "meeting-notes" | "transcripts" | "research"
                  )
                }
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-lg",
                  "bg-gray-50 border border-gray-200",
                  "hover:border-black/50 hover:bg-gray-50",
                  "transition-colors duration-200"
                )}
              >
                <span className="text-sm text-gray-700">{item.label}</span>
                <Download className="w-4 h-4 text-gray-500" />
              </button>
            ))}
          </div>
        </div>

        {/* Delete Data */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
            <Trash2 className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">データ削除</span>
          </div>
          <div
            className={cn(
              "p-4 rounded-lg border",
              "bg-gray-100 border-gray-200"
            )}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">
                  すべてのデータを削除
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  この操作は元に戻せません。すべての議事録、文字起こし、リサーチ結果、スケジュールが永久に削除されます。
                </p>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className={cn(
                      "mt-3 px-4 py-2 rounded-lg text-sm font-medium",
                      "bg-gray-200 text-gray-700 border border-gray-300",
                      "hover:bg-gray-300 transition-colors"
                    )}
                  >
                    データを削除
                  </button>
                ) : (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-gray-600">
                      確認のため「削除」と入力してください
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="削除"
                        className={cn(
                          "flex-1 px-3 py-2 rounded-lg",
                          "bg-gray-50 border border-gray-300",
                          "text-gray-900 text-sm placeholder:text-gray-400",
                          "focus:outline-none focus:border-gray-500"
                        )}
                      />
                      <button
                        onClick={handleDelete}
                        disabled={deleteConfirmText !== "削除"}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium",
                          "bg-gray-700 text-white",
                          "hover:bg-gray-800 transition-colors",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        削除する
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText("");
                        }}
                        className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}

// ============================================
// Main Page Component
// ============================================
export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">設定</h1>
              <p className="text-gray-500 mt-1">
                アカウントとアプリケーションの設定を管理します
              </p>
            </div>

            {/* Settings Sections */}
            <div className="space-y-6">
              <ProfileSection />
              <NotificationSection />
              <GrokToolSection />
              <DataManagementSection />
            </div>

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <button
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-lg",
                  "bg-black text-white font-medium",
                  "hover:bg-gray-800 transition-colors"
                )}
              >
                <Save className="w-4 h-4" />
                変更を保存
              </button>
            </div>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
