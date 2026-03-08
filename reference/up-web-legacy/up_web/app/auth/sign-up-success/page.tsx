import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail } from "lucide-react";

export default function SignUpSuccessPage() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">確認メールを送信しました</h1>
        <p className="mt-4 text-muted-foreground">
          ご登録いただいたメールアドレス宛に確認メールを送信しました。
          <br />
          メール内のリンクをクリックしてアカウントを有効化してください。
        </p>

        <div className="mt-8 rounded-lg bg-muted p-4 text-left text-sm">
          <p className="font-medium">メールが届かない場合</p>
          <ul className="mt-2 list-inside list-disc text-muted-foreground">
            <li>迷惑メールフォルダを確認してください</li>
            <li>メールアドレスが正しいかご確認ください</li>
          </ul>
        </div>

        <Button variant="outline" className="mt-6" asChild>
          <Link href="/auth/login">ログイン画面へ戻る</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
