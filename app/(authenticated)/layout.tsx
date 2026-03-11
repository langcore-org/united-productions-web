import { redirect } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/server";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  return <AppLayout>{children}</AppLayout>;
}
