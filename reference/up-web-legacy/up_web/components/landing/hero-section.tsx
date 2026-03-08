import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 py-20 md:py-32">
      <div className="container relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            番組制作を、
            <span className="text-primary">AIで加速する。</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            リサーチ・企画・構成作業を
            <br className="sm:hidden" />
            専門AIエージェントがサポート
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/auth/sign-up">無料で始める</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/features">デモを見る</Link>
            </Button>
          </div>
        </div>
      </div>
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>
    </section>
  );
}
