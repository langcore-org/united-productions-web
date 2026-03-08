import { Card, CardContent } from "@/components/ui/card";

const problems = [
  {
    icon: "😰",
    title: "AIの使い方がわからない",
    description: "専門的なプロンプティングが必要で、うまく使いこなせない",
  },
  {
    icon: "💸",
    title: "外注コストがかさむ",
    description: "構成作家・調査作家への依頼コストが増加している",
  },
  {
    icon: "⏰",
    title: "毎回背景説明が必要",
    description: "ChatGPTでは毎回番組の背景を説明しなければならない",
  },
];

export function ProblemSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold md:text-3xl">
            こんな課題を抱えていませんか？
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {problems.map((problem, index) => (
            <Card
              key={index}
              className="group transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <CardContent className="p-6 text-center">
                <div className="text-4xl">{problem.icon}</div>
                <h3 className="mt-4 text-lg font-semibold">{problem.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {problem.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
