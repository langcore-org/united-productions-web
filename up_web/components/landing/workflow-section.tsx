import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: "①",
    title: "番組作成",
    description: "番組単位でGoogle Driveを連携",
  },
  {
    number: "②",
    title: "チーム作成",
    description: "エージェントタイプを選択して作成",
  },
  {
    number: "③",
    title: "@で参照",
    description: "ドライブのファイルを@メンションで参照",
  },
  {
    number: "④",
    title: "成果物出力",
    description: "Google Docとして自動出力",
  },
];

export function WorkflowSection() {
  return (
    <section className="bg-muted/30 py-16 md:py-24">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold md:text-3xl">
            シンプルなワークフロー
          </h2>
        </div>
        <div className="mt-12">
          {/* Desktop horizontal flow */}
          <div className="hidden md:flex items-start justify-center gap-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start">
                <div className="flex flex-col items-center text-center w-48">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                    {step.number}
                  </div>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="mx-4 mt-6 h-6 w-6 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Mobile vertical flow */}
          <div className="md:hidden space-y-6">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  {step.number}
                </div>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
