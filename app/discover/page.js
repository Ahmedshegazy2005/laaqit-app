import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { LEVELS, levelLabel } from "@/lib/levels";
import { getLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import SiteBrand from "@/components/SiteBrand";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default async function DiscoverPage() {
  const lang = getLang();
  const admin = createAdminClient();

  const { data: reports } = await admin
    .from("skill_reports")
    .select("*, profiles(github_username, avatar_url, level)")
    .order("analyzed_at", { ascending: false })
    .limit(30);

  return (
    <main className="wrap" style={{ paddingTop: 28, paddingBottom: 80 }}>
      <div className="social-topbar">
        <div className="topbar-row"><SiteBrand lang={lang} /><LanguageSwitcher lang={lang} /></div>
        <nav>
          <Link href="/social">{t("nav.community", lang)}</Link>
          <Link href="/login">{t("nav.signin", lang)}</Link>
        </nav>
      </div>

      <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, marginBottom: 8 }}>
        {t("discover.title", lang)}
      </h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 36 }}>
        {t("discover.sub", lang)}
      </p>

      {(!reports || reports.length === 0) && (
        <div className="card">{t("discover.empty", lang)}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
        {(reports || []).map((r) => (
          <div key={r.id} className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              {r.profiles?.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.profiles.avatar_url} alt="" width={40} height={40} style={{ borderRadius: "50%" }} />
              )}
              <div style={{ fontWeight: 600 }}>{r.profiles?.github_username}</div>
              {r.profiles?.level && <span className={`level-badge ${r.profiles.level}`}>{LEVELS[r.profiles.level]?.emoji} {levelLabel(r.profiles.level, lang)}</span>}
            </div>
            {Object.entries(r.summary?.scores || {}).slice(0, 2).map(([key, val]) => (
              <div key={key} style={{ display: "grid", gridTemplateColumns: "90px 1fr 28px", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{t(`skill.${key}`, lang)}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${val}%` }} />
                </div>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{val}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}