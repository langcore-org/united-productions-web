"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("表示名を入力してください");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { error } = await supabase.from("users").upsert({
        id: user.id,
        email: user.email,
        display_name: displayName.trim(),
        avatar_url: avatarUrl || null,
      });

      if (error) {
        setError("プロフィールの保存に失敗しました。もう一度お試しください。");
        return;
      }

      router.push("/mypage");
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.push("/mypage");
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">プロフィールを設定</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-2xl">
                {displayName ? displayName[0].toUpperCase() : "?"}
              </AvatarFallback>
            </Avatar>
            <Button type="button" variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              画像をアップロード
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">表示名 *</Label>
            <Input
              id="displayName"
              placeholder="山田 太郎"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">役職（任意）</Label>
            <Input
              id="title"
              placeholder="ディレクター"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            完了
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={handleSkip}
          >
            あとで設定する →
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
