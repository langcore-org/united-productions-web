import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component から呼ばれた場合など
          }
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    console.log(`[CALLBACK] code=${code ? "yes" : "no"} error=${error?.message ?? "none"} origin=${origin} next=${next}`);
    if (!error) {
      const allCookies = cookieStore.getAll();
      const sbCookies = allCookies.filter((c) => c.name.startsWith("sb-"));
      console.log(`[CALLBACK] sb-cookies set: ${sbCookies.length} names=[${sbCookies.map((c) => c.name).join(",")}]`);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
