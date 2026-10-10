"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LEVELS } from "@/lib/levels";
import { t } from "@/lib/i18n";

export default function LevelPicker({ lang = "ar" }) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  async function pick(level) {
    if (busy) return;
    setBusy(level);
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const { error: saveError } = await supabase
      .from("profiles")
      .update({ level, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (saveError) {
      setError(saveError.message);
      setBusy(null);
      return;
    }
    router.push("/social");
    router.refresh();
  }

  return (
    <div className="level-grid">
      {Object.entries(LEVELS).map(([key, item]) => (
        <button
          key={key}
          type="button"
          className={`level-card ${key}${busy === key ? " is-picking" : ""}`}
          onClick={() => pick(key)}
          disabled={!!busy}
        >
          <span className="level-emoji">{item.emoji}</span>
          <strong>{item.label[lang]}</strong>
          <small>{item.desc[lang]}</small>
          {busy === key && <span className="mono level-loading">{t("onboarding.saving", lang)}</span>}
        </button>
      ))}
      {error && <p className="form-error">{t("onboarding.saveError", lang)} {error}</p>}
    </div>
  );
}