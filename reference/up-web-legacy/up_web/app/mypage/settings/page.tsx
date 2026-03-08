"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { DarkModeSelector } from "@/components/settings/DarkModeSelector";
import { ThemePresetSelector } from "@/components/settings/ThemePresetSelector";
import { useUserTheme } from "@/hooks/use-user-theme";
import type { UserSettings, DarkMode, ThemePreset, NotificationFrequency } from "@/lib/settings/types";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  // Theme hook
  const { applyDarkMode, applyThemePreset } = useUserTheme({
    initialDarkMode: settings?.darkmode || 'system',
    initialThemePreset: settings?.theme || 'default',
  });

  // Fetch settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
          // Apply theme immediately
          applyDarkMode(data.darkmode);
          applyThemePreset(data.theme);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleDarkModeChange = async (mode: DarkMode) => {
    if (!settings) return;

    // Apply immediately
    applyDarkMode(mode);
    setSettings({ ...settings, darkmode: mode });

    // Save to server
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ darkmode: mode }),
      });
    } catch (error) {
      console.error('Failed to save darkmode:', error);
      // Revert on error
      applyDarkMode(settings.darkmode);
      setSettings(settings);
    }
  };

  const handleThemeChange = async (theme: ThemePreset) => {
    if (!settings) return;

    // Apply immediately
    applyThemePreset(theme);
    setSettings({ ...settings, theme });

    // Save to server
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      });
    } catch (error) {
      console.error('Failed to save theme:', error);
      // Revert on error
      applyThemePreset(settings.theme);
      setSettings(settings);
    }
  };

  const handleNotificationChange = (field: string, value: boolean | NotificationFrequency) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const handleSaveNotifications = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_notifications: settings.email_notifications,
          push_notifications: settings.push_notifications,
          notification_frequency: settings.notification_frequency,
        }),
      });
    } catch (error) {
      console.error('Failed to save notifications:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="アカウント設定"
        description="外観、通知などの設定を変更します"
      />

      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            🎨 外観
          </CardTitle>
          <CardDescription>
            アプリケーションの表示モードとカラーテーマを設定します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dark Mode */}
          <div className="space-y-4">
            <Label className="text-base font-medium">表示モード</Label>
            <DarkModeSelector
              selectedMode={settings?.darkmode || 'system'}
              onChange={handleDarkModeChange}
            />
          </div>

          <Separator />

          {/* Color Theme */}
          <div className="space-y-4">
            <Label className="text-base font-medium">カラーテーマ</Label>
            <ThemePresetSelector
              selectedPreset={settings?.theme || 'default'}
              onPresetChange={handleThemeChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">通知</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>メール通知</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emailNotifications"
                  checked={settings?.email_notifications ?? true}
                  onCheckedChange={(checked) => handleNotificationChange('email_notifications', checked === true)}
                />
                <Label htmlFor="emailNotifications" className="font-normal">
                  メール通知を受け取る
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pushNotifications"
                  checked={settings?.push_notifications ?? true}
                  onCheckedChange={(checked) => handleNotificationChange('push_notifications', checked === true)}
                />
                <Label htmlFor="pushNotifications" className="font-normal">
                  プッシュ通知を受け取る
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label>通知頻度</Label>
            <RadioGroup
              value={settings?.notification_frequency || 'realtime'}
              onValueChange={(value) => handleNotificationChange('notification_frequency', value as NotificationFrequency)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="realtime" id="realtime" />
                <Label htmlFor="realtime" className="font-normal">リアルタイム</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily" className="font-normal">1日1回</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="font-normal">なし</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="pt-4">
            <Button onClick={handleSaveNotifications} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              通知設定を保存
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">アカウント削除</CardTitle>
          <CardDescription>
            アカウントを削除すると、すべてのデータが削除されます。この操作は取り消せません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">アカウントを削除する</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>本当にアカウントを削除しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  この操作は取り消せません。すべてのデータが永久に削除されます。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
