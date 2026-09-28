import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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

      const admin = createAdminClient();
      await admin.from("profiles").upsert(
        {
          id: user.id,
          github_username: githubUsername,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
