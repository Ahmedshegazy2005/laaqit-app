"use client";

import { LANGS } from "@/lib/i18n";

// زرار تبديل اللغة (عربي/English) — بيحفظ الاختيار ويحدّث الصفحة
export default function LanguageSwitcher({ lang = "ar" }) {
  function setLang(code) {
    if (code === lang) return;
    document.cookie = `lang=${code}; path=/; max-age=31536000; samesite=lax`;
    try {
      localStorage.setItem("laaqit-lang", code);
    } catch {}
    window.location.reload();
  }

  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          className={lang === l.code ? "active" : ""}
          aria-pressed={lang === l.code}
          onClick={() => setLang(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}