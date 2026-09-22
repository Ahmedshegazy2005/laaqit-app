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
        scopes: "read:user public_repo",
      },
    });
  }

  return (
    <main className="wrap" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div className="mono" style={{ color: "var(--signal)", fontSize: 13, marginBottom: 16 }}>
          تسجيل الدخول
        </div>
        <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 24, marginBottom: 12 }}>
          اربط حسابك على لاقط
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 14.5, marginBottom: 28 }}>
          هنستخدم حساب GitHub بتاعك بس عشان نحلل مشاريعك العامة. مش هنلمس أي كود خاص.
        </p>
        <button onClick={signInWithGitHub} className="btn btn-signal" style={{ width: "100%", justifyContent: "center" }}>
          سجّل دخول بحساب GitHub
        </button>
      </div>
    </main>
  );
}
