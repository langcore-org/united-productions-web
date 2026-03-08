import {
  PublicHeader,
  HeroSection,
  ProblemSection,
  SolutionSection,
  AgentTypesSection,
  WorkflowSection,
  CTASection,
  PublicFooter,
} from "@/components/landing";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <AgentTypesSection />
        <WorkflowSection />
        <CTASection />
      </main>
      <PublicFooter />
    </div>
  );
}
