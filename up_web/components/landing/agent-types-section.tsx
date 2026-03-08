"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const agents = [
  {
    icon: "🔍",
    title: "リサーチ",
    tasks: ["情報収集", "調査資料作成"],
  },
  {
    icon: "💡",
    title: "ネタ探し",
    tasks: ["トレンド分析", "話題発掘"],
  },
  {
    icon: "📝",
    title: "企画作家",
    tasks: ["企画立案", "企画書作成"],
  },
  {
    icon: "🎬",
    title: "構成作家",
    tasks: ["台本作成", "構成作成"],
  },
];

export function AgentTypesSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold md:text-3xl">
            4つの専門エージェント
          </h2>
          <p className="mt-4 text-muted-foreground">
            番組制作の各工程に特化したAIエージェントが、あなたの作業をサポートします
          </p>
        </div>

        {/* Desktop grid */}
        <div className="mt-12 hidden md:grid md:grid-cols-4 gap-6">
          {agents.map((agent, index) => (
            <AgentCard key={index} agent={agent} />
          ))}
        </div>

        {/* Mobile carousel */}
        <div className="mt-12 md:hidden">
          <Carousel className="w-full">
            <CarouselContent>
              {agents.map((agent, index) => (
                <CarouselItem key={index} className="basis-4/5">
                  <AgentCard agent={agent} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0" />
            <CarouselNext className="right-0" />
          </Carousel>
        </div>
      </div>
    </section>
  );
}

function AgentCard({
  agent,
}: {
  agent: { icon: string; title: string; tasks: string[] };
}) {
  return (
    <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1">
      <CardContent className="p-6 text-center">
        <div className="text-4xl">{agent.icon}</div>
        <h3 className="mt-4 text-lg font-semibold">{agent.title}</h3>
        <ul className="mt-4 space-y-1">
          {agent.tasks.map((task, taskIndex) => (
            <li key={taskIndex} className="text-sm text-muted-foreground">
              {task}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
