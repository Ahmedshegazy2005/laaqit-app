import { getLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import SiteBrand from "@/components/SiteBrand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LoginButton from "./LoginButton";

export default async function LoginPage() {
  const lang = getLang();
  return (
    <main className="wrap" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="social-topbar" style={{ borderBottom: "none", marginBottom: 0 }}>
        <div className="topbar-row"><SiteBrand lang={lang} /><LanguageSwitcher lang={lang} /></div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card" style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <div className="mono" style={{ color: "var(--signal)", fontSize: 13, marginBottom: 16 }}>
            {t("login.mono", lang)}
          </div>
          <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 24, marginBottom: 12 }}>
            {t("login.title", lang)}
          </h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 14.5, marginBottom: 28 }}>
            {t("login.sub", lang)}
          </p>
          <LoginButton lang={lang} />
        </div>
      </div>
    </main>
  );
}