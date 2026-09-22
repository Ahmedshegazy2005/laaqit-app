import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// After GitHub OAuth succeeds, Supabase redirects here with a `code`.
// We exchange it for a session, then save the GitHub username + provider
// access token (needed later to read the user's public repos) into `profiles`.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session) {
      const user = data.session.user;
      const githubUsername =
        user.user_metadata?.user_name || user.user_metadata?.preferred_username || null;
      const avatarUrl = user.user_metadata?.avatar_url || null;
      const providerToken = data.session.provider_token || null;

      const admin = createAdminClient();
      await admin.from("profiles").upsert(
        {
          id: user.id,
          github_username: githubUsername,
          avatar_url: avatarUrl,
          github_access_token: providerToken, // used server-side only to fetch repos
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
