import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/mypage";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth error
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent("認証コードがありません")}`
    );
  }

  const supabase = await createClient();

  // Exchange code for session
  const { data: sessionData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("Exchange code error:", exchangeError);
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent(exchangeError.message)}`
    );
  }

  const user = sessionData?.user;

  if (!user) {
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent("ユーザー情報の取得に失敗しました")}`
    );
  }

  // Determine auth provider
  const provider = user.app_metadata?.provider || "email";
  let authProvider: "email" | "google" | "azure" | "github" = "email";
  if (provider === "google") authProvider = "google";
  else if (provider === "azure") authProvider = "azure";
  else if (provider === "github") authProvider = "github";

  // Check if user exists in users table
  const { data: existingUser, error: fetchError } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    // PGRST116 = not found, which is expected for new users
    console.error("Fetch user error:", fetchError);
  }

  if (!existingUser) {
    // Create new user record
    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "User";

    const avatarUrl =
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null;

    const { error: insertError } = await supabase.from("users").insert({
      id: user.id,
      email: user.email,
      display_name: displayName,
      avatar_url: avatarUrl,
      auth_provider: authProvider,
      auth_provider_id: user.user_metadata?.provider_id || null,
      is_system_admin: false,
    });

    if (insertError) {
      console.error("Insert user error:", insertError);
      // Don't fail the login, just log the error
      // User can complete profile later
    } else {
      console.log("Created new user:", user.id, user.email);
      // Redirect to complete profile for new users
      return NextResponse.redirect(`${origin}/auth/complete-profile`);
    }
  }

  // Existing user - redirect to next page
  return NextResponse.redirect(`${origin}${next}`);
}
