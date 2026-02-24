import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { AppLayout } from "@/components/layout/AppLayout";
import { authOptions } from "@/lib/auth-options";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  const typedSession = session as Session | null;
  if (!typedSession?.user?.id) {
    redirect("/auth/signin");
  }

  return <AppLayout>{children}</AppLayout>;
}
