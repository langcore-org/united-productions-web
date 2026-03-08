import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl rounded-2xl bg-primary p-8 text-center text-primary-foreground md:p-12">
          <h2 className="text-2xl font-bold md:text-3xl">
            今すぐ始めましょう
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            番組制作の効率化を、AD-Agentで体験してください
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-8 group"
            asChild
          >
            <Link href="/auth/sign-up">
              無料で始める
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
