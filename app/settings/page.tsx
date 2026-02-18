"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";

import { LLMSelector, LLMProvider } from "@/components/ui/LLMSelector";
import {
  User,
  Camera,
  Key,
  Bell,
  Database,
  Download,
  Trash2,
  AlertTriangle,
  Check,
  X,
  Mail,
  MessageSquare,
  Calendar,
  ChevronRight,
  Save,
} from "lucide-react";

// ============================================
// Types
// ============================================
interface ProfileData {
  displayName: string;
  email: string;
  avatar: string | null;
}

interface LLMSettings {
  defaultModel: LLMProvider;
  apiKeys: Record<string, string>;
}

interface NotificationSettings {
  email: {
    enabled: boolean;
    meetingNotes: boolean;
    transcripts: boolean;
    research: boolean;
    schedules: boolean;
  };
  push: {
    enabled: boolean;
    meetingNotes: boolean;
    transcripts: boolean;
    research: boolean;
    schedules: boolean;
  };
}

// ============================================
// Mock Data
// ============================================
const ALL_PROVIDERS: LLMProvider[] = [
  "gemini-2.5-flash-lite",
  "gemini-3.0-flash",
  "grok-4.1-fast",
  "grok-4",
  "gpt-4o-mini",
  "gpt-5",
  "claude-sonnet-4.5",
  "claude-opus-4.6",
  "perplexity-sonar",
  "perplexity-sonar-pro",
];

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  xai: "xAI",
  openai: "OpenAI",
  anthropic: "Anthropic",
  perplexity: "Perplexity",
};

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
          <div className="w-10 h-10 rounded-lg bg-[#ff6b00]/10 flex items-center justify-center">
            <span className="text-[#ff6b00]">{icon}</span>
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
          checked ? "bg-[#ff6b00]" : "bg-gray-100"
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
    // TODO: Save to API
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
              "hover:border-[#ff6b00]/50 transition-colors"
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
              <Camera className="w-5 h-5 text-gray-900" />
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
              className="text-sm text-[#ff6b00] hover:underline mt-2"
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
                  "text-white text-sm",
                  "focus:outline-none focus:border-[#ff6b00]/50"
                )}
              />
              <button
                onClick={handleSave}
                className="p-2 rounded-lg bg-[#ff6b00] text-white hover:bg-[#ff8533] transition-colors"
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
                className="text-sm text-[#ff6b00] hover:underline"
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
 * LLM Settings Section
 */
function LLMSection() {
  const [settings, setSettings] = useState<LLMSettings>({
    defaultModel: "gemini-2.5-flash-lite",
    apiKeys: {
      openai: "",
      anthropic: "",
      xai: "",
    },
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const handleApiKeyChange = (provider: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [provider]: value },
    }));
  };

  const toggleShowKey = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  return (
    <SettingsCard
      title="LLM設定"
      description="デフォルトモデルとAPIキーを設定します"
      icon={<Key className="w-5 h-5" />}
    >
      <div className="space-y-6">
        {/* Default Model */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            デフォルトモデル
          </label>
          <LLMSelector
            value={settings.defaultModel}
            onChange={(model) =>
              setSettings((prev) => ({ ...prev, defaultModel: model }))
            }
            supportedProviders={ALL_PROVIDERS}
            recommendedProvider="gemini-2.5-flash-lite"
          />
          <p className="text-xs text-gray-500">
            チャットで使用されるデフォルトのAIモデルを選択します
          </p>
        </div>

        {/* API Keys */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">APIキー</label>
            <span className="text-xs text-gray-500">
              個別のAPIキーを設定できます
            </span>
          </div>

          {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <label className="text-xs text-gray-600">{label}</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showKeys[key] ? "text" : "password"}
                    value={settings.apiKeys[key] || ""}
                    onChange={(e) => handleApiKeyChange(key, e.target.value)}
                    placeholder={`${label} APIキーを入力`}
                    className={cn(
                      "w-full px-3 py-2 pr-10 rounded-lg",
                      "bg-gray-50 border border-gray-200",
                      "text-white text-sm placeholder:text-gray-400",
                      "focus:outline-none focus:border-[#ff6b00]/50"
                    )}
                  />
                  <button
                    onClick={() => toggleShowKey(key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showKeys[key] ? (
                      <span className="text-xs">非表示</span>
                    ) : (
                      <span className="text-xs">表示</span>
                    )}
                  </button>
                </div>
                {settings.apiKeys[key] && (
                  <button
                    onClick={() => handleApiKeyChange(key, "")}
                    className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
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
      schedules: true,
    },
    push: {
      enabled: true,
      meetingNotes: true,
      transcripts: false,
      research: true,
      schedules: true,
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
              <Toggle
                checked={settings.email.schedules}
                onChange={(checked) =>
                  updateEmailSetting("schedules", checked)
                }
                label="ロケスケ管理"
              />
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
              <Toggle
                checked={settings.push.schedules}
                onChange={(checked) =>
                  updatePushSetting("schedules", checked)
                }
                label="ロケスケ管理"
              />
            </div>
          )}
        </div>
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

  const handleExport = (type: "all" | "meeting-notes" | "transcripts" | "research" | "schedules") => {
    // TODO: Implement export
    console.log(`Exporting ${type}...`);
  };

  const handleDelete = () => {
    if (deleteConfirmText === "削除") {
      // TODO: Implement delete
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
              { id: "schedules", label: "ロケスケ管理" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  handleExport(
                    item.id as "all" | "meeting-notes" | "transcripts" | "research" | "schedules"
                  )
                }
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-lg",
                  "bg-gray-50 border border-gray-200",
                  "hover:border-[#ff6b00]/50 hover:bg-gray-50",
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
            <Trash2 className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">データ削除</span>
          </div>
          <div
            className={cn(
              "p-4 rounded-lg border",
              "bg-red-500/5 border-red-500/20"
            )}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">
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
                      "bg-red-500/10 text-red-400 border border-red-500/20",
                      "hover:bg-red-500/20 transition-colors"
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
                          "bg-gray-50 border border-red-500/30",
                          "text-white text-sm placeholder:text-gray-400",
                          "focus:outline-none focus:border-red-500"
                        )}
                      />
                      <button
                        onClick={handleDelete}
                        disabled={deleteConfirmText !== "削除"}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium",
                          "bg-red-500 text-gray-900",
                          "hover:bg-red-600 transition-colors",
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
    <div >
      
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
              <LLMSection />
              <NotificationSection />
              <DataManagementSection />
            </div>

            {/* Save Button (Fixed at bottom on mobile) */}
            <div className="mt-8 flex justify-end">
              <button
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-lg",
                  "bg-[#ff6b00] text-white font-medium",
                  "hover:bg-[#ff8533] transition-colors"
                )}
              >
                <Save className="w-4 h-4" />
                変更を保存
              </button>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>AI Hub v1.0.0</span>
                <div className="flex items-center gap-4">
                  <a href="#" className="hover:text-gray-700 transition-colors">
                    利用規約
                  </a>
                  <a href="#" className="hover:text-gray-700 transition-colors">
                    プライバシーポリシー
                  </a>
                  <a href="#" className="hover:text-gray-700 transition-colors">
                    ヘルプ
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
        </AppLayout>
  );
}