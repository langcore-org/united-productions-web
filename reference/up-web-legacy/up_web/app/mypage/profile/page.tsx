"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, User } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { ImageUpload } from "@/components/uploads/ImageUpload";

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load user data
  useEffect(() => {
    async function loadUserData() {
      try {
        // Get user profile from users table
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          setEmail(data.email || "");
          setAvatarUrl(data.avatar_url || null);
          setDisplayName(data.display_name || data.email?.split("@")[0] || "");
        }
      } catch (error) {
        console.error("Failed to load user data:", error);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadUserData();
  }, []);

  const handleAvatarUpload = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/user/avatar", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload avatar");
    }

    const data = await response.json();
    setAvatarUrl(data.avatar_url);
    return data.avatar_url;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Save display_name to users table
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName }),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="プロフィール設定"
          description="アカウント情報を編集します"
        />
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="プロフィール設定"
        description="アカウント情報を編集します"
      />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <ImageUpload
              currentImageUrl={avatarUrl}
              onUpload={handleAvatarUpload}
              aspectRatio={1}
              cropShape="round"
              placeholder={<User className="h-10 w-10 text-muted-foreground" />}
              buttonLabel="画像を変更"
              imageClassName="h-24 w-24"
            />

            <div className="space-y-2">
              <Label htmlFor="displayName">表示名 *</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                メールアドレスは変更できません
              </p>
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaved ? "保存しました" : "保存する"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">パスワード変更</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/auth/forgot-password">パスワードを変更 →</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
