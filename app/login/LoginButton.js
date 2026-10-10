"use client";

import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";

export default function LoginButton({ lang = "ar" }) {
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
    <button onClick={signInWithGitHub} className="btn btn-signal" style={{ width: "100%", justifyContent: "center" }}>
      {t("login.button", lang)}
    </button>
  );
}