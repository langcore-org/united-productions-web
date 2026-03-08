import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>;
}) {
  const params = await searchParams;

  const errorMessages: Record<string, string> = {
    invalid_credentials: "メールアドレスまたはパスワードが正しくありません",
    email_not_confirmed: "メールアドレスが確認されていません",
    user_already_exists: "このメールアドレスは既に登録されています",
    expired_token: "リンクが期限切れです",
    invalid_token: "無効なリンクです",
    invitation_expired: "招待が期限切れです",
  };

  const errorMessage =
    params.error && errorMessages[params.error]
      ? errorMessages[params.error]
      : params.error_description || "認証エラーが発生しました";

  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-semibold">認証エラー</h1>
        <p className="mt-4 text-muted-foreground">{errorMessage}</p>
        <Button className="mt-6" asChild>
          <Link href="/auth/login">ログイン画面へ戻る</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
