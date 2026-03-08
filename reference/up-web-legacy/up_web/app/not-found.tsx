import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-muted-foreground/30">404</h1>
        <h2 className="mt-4 text-2xl font-semibold">
          ページが見つかりません
        </h2>
        <p className="mt-2 text-muted-foreground">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="default">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              ホームに戻る
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/mypage">
              <ArrowLeft className="mr-2 h-4 w-4" />
              マイページへ
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
