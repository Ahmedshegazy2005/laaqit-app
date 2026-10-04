"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  async function signInWithGitHub() {
    const redirectTo =
      (typeof window !== "undefined" ? window.location.origin : "") + "/auth/callback";
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo,
        scopes: "read:user",
      },
    });
  }

  return (
    <main className="wrap" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div className="mono" style={{ color: "var(--signal)", fontSize: 13, marginBottom: 16 }}>
          Sign in
        </div>
        <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 24, marginBottom: 12 }}>
          Connect your account to Laaqit
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 14.5, marginBottom: 16 }}>
          We only read your name and avatar from GitHub, and analyze your public repos. We never modify anything, and we don't store any token.
        </p>
        <p style={{ color: "var(--ink-dim)", fontSize: 12.5, marginBottom: 28, lineHeight: 1.7 }}>
          You'll land on a GitHub consent screen — make sure you're authorizing with **your own account**. The line "Laaqit by Ahmedshegazy2005" you'll see there just means who built the app, it has nothing to do with which account you're signing in with.
        </p>
        <button onClick={signInWithGitHub} className="btn btn-signal" style={{ width: "100%", justifyContent: "center" }}>
          Sign in with GitHub
        </button>
      </div>
    </main>
  );
}
