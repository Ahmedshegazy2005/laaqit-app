import Link from "next/link";
import { getLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import SiteBrand from "@/components/SiteBrand";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function HomePage() {
  const lang = getLang();
  return (
    <main>
      <header style={{ borderBottom: "1px solid var(--line)", padding: "16px 0" }}>
        <div className="wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <SiteBrand lang={lang} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <LanguageSwitcher lang={lang} />
            <Link href="/discover" className="btn btn-ghost">{t("nav.discover", lang)}</Link>
            <Link href="/social" className="btn btn-ghost">{t("nav.community", lang)}</Link>
            <Link href="/login" className="btn btn-signal">{t("nav.signin", lang)}</Link>
          </div>
        </div>
      </header>

      <section className="wrap" style={{ padding: "80px 0 60px", maxWidth: 720 }}>
        <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "clamp(32px,5vw,50px)", lineHeight: 1.2, marginBottom: 22 }}>
          {t("home.heroTitle", lang)}
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 18, lineHeight: 1.75, marginBottom: 32 }}>
          {t("home.heroSub", lang)}
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Link href="/login" className="btn btn-signal">{t("home.signupDev", lang)}</Link>
          <Link href="/discover" className="btn btn-ghost">{t("home.exploreCompany", lang)}</Link>
        </div>
      </section>
    </main>
  );
}