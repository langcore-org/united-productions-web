import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

function getOrigin(requestUrl: string): string {
  const { origin: requestOrigin } = new URL(requestUrl);
  return process.env.NEXT_PUBLIC_SITE_URL || requestOrigin;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(`${getOrigin(request.url)}/`);
}

// Also handle GET requests for direct URL access
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(`${getOrigin(request.url)}/`);
}
