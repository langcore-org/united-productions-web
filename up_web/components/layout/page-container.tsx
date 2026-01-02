import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <main
      className={cn(
        "flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6 lg:p-8",
        className
      )}
    >
      {children}
    </main>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  backHref?: string;
}

export function PageHeader({
  title,
  description,
  children,
  backHref,
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        {backHref && (
          <a
            href={backHref}
            className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← 戻る
          </a>
        )}
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

interface PageSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function PageSection({
  title,
  description,
  children,
  className,
}: PageSectionProps) {
  return (
    <section
      className={cn(
        "rounded-lg border bg-card p-4 shadow-sm md:p-6",
        className
      )}
    >
      {(title || description) && (
        <div className="mb-4">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="mb-4 text-4xl text-muted-foreground">{icon}</div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
