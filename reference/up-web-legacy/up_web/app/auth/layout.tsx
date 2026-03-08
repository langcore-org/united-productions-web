import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🎬</span>
          <span className="text-xl font-semibold">AD-Agent</span>
        </Link>
      </div>
      {children}
    </div>
  );
}
