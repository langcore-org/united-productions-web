import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicHeader, PublicFooter } from "@/components/landing";

const features = [
  {
    title: "番組×チームでコンテキスト管理",
    description:
      "番組ごとにGoogle Driveと連携し、チームごとに参照ファイルを設定。毎回の背景説明が不要になります。",
    align: "left",
  },
  {
    title: "@メンションでファイル参照",
    description:
      "チャット中に@を入力するだけでドライブ内のファイルを参照。PDF、Doc、スプレッドシートに対応しています。",
    align: "right",
  },
  {
    title: "ワンクリックでGoogle Doc出力",
    description:
      "AIの回答をそのまま成果物に。チーム設定の出力先に自動保存され、編集可能なGoogle Docで出力されます。",
    align: "left",
  },
];

export default function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="py-16 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-3xl font-bold md:text-4xl">機能紹介</h1>
              <p className="mt-4 text-muted-foreground">
                AD-Agentの主要機能をご紹介します
              </p>
            </div>

            <div className="mt-16 space-y-24">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`flex flex-col gap-8 md:flex-row md:items-center ${
                    feature.align === "right" ? "md:flex-row-reverse" : ""
                  }`}
                >
                  <div className="flex-1">
                    <div className="aspect-video rounded-lg bg-muted/50 border flex items-center justify-center">
                      <span className="text-4xl text-muted-foreground">
                        📷 スクリーンショット
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <h2 className="text-2xl font-bold">{feature.title}</h2>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-24 text-center">
              <Button size="lg" asChild>
                <Link href="/auth/sign-up">無料で始める</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
