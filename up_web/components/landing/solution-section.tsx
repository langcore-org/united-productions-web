import { Card, CardContent } from "@/components/ui/card";

const solutions = [
  {
    icon: "🎯",
    title: "番組×チームでコンテキスト管理",
    description: "毎回の背景説明が不要。番組ごとに情報を蓄積",
  },
  {
    icon: "📁",
    title: "Google Drive連携",
    description: "既存のドライブファイルを@メンションで参照",
  },
  {
    icon: "🤖",
    title: "専門エージェント",
    description: "リサーチ/企画/構成に特化したAIがサポート",
  },
];

export function SolutionSection() {
  return (
    <section className="bg-muted/30 py-16 md:py-24">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold md:text-3xl">
            AD-Agentが解決します
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {solutions.map((solution, index) => (
            <Card
              key={index}
              className="group border-primary/20 bg-background transition-all hover:border-primary hover:shadow-lg hover:-translate-y-1"
            >
              <CardContent className="p-6 text-center">
                <div className="text-4xl">{solution.icon}</div>
                <h3 className="mt-4 text-lg font-semibold">{solution.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {solution.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
