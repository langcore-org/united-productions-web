"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) {
        setError("リセットメールの送信に失敗しました。もう一度お試しください。");
        return;
      }

      setIsSuccess(true);
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold">メールを送信しました</h1>
          <p className="mt-4 text-muted-foreground">
            {email} 宛にパスワードリセット用のリンクを送信しました。
            <br />
            メール内のリンクをクリックして新しいパスワードを設定してください。
          </p>
          <Button variant="outline" className="mt-6" asChild>
            <Link href="/auth/login">ログイン画面へ戻る</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">パスワードをリセット</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          登録したメールアドレスを入力してください。
          <br />
          パスワードリセット用のリンクを送信します。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            リセットリンクを送信
          </Button>
        </form>

        <Button variant="ghost" className="mt-6 w-full" asChild>
          <Link href="/auth/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            ログイン画面へ戻る
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
