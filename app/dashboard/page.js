import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LEVELS, levelLabel } from "@/lib/levels";
import { getLang } from "@/lib/i18n-server";
import { t, localeFor } from "@/lib/i18n";
import AnalyzeButton from "./AnalyzeButton";
import SiteBrand from "@/components/SiteBrand";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default async function DashboardPage() {
  const lang = getLang();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  // لسه ما اختارش مستواه؟ ودّيه يختاره الأول
  if (!profile?.level) redirect("/onboarding");

  const { data: report } = await supabase
    .from("skill_reports")
    .select("*")
    .eq("profile_id", user.id)
    .order("analyzed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="wrap" style={{ paddingTop: 28, paddingBottom: 80 }}>
      <div className="social-topbar">
        <div className="topbar-row"><SiteBrand lang={lang} /><LanguageSwitcher lang={lang} /></div>
        <nav>
          <Link href="/social">{t("nav.community", lang)}</Link>
          <Link href="/dashboard">{t("nav.analysis", lang)}</Link>
          <Link href={`/profile/${user.id}`}>{t("nav.myProfile", lang)}</Link>
          <Link href="/settings">{t("nav.settings", lang)}</Link>
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 40 }}>
        {profile?.avatar_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" width={52} height={52} style={{ borderRadius: "50%" }} />
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 19, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            {profile?.github_username || user.email}
            {profile?.level && <span className={`level-badge ${profile.level}`}>{LEVELS[profile.level]?.emoji} {levelLabel(profile.level, lang)}</span>}
          </div>
          <div className="mono" style={{ color: "var(--ink-dim)", fontSize: 13 }}>
            {t("dashboard.subtitle", lang)}
          </div>
        </div>
      </div>

      {!report && (
        <div className="card" style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, marginBottom: 10 }}>
            {t("dashboard.noReportTitle", lang)}
          </h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 14.5, marginBottom: 22 }}>
            {t("dashboard.noReportSub", lang)}
          </p>
          <AnalyzeButton lang={lang} />
        </div>
      )}

      {report && (
        <div className="card" style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20 }}>{t("dashboard.skillsCard", lang)}</h2>
            <span className="mono" style={{ fontSize: 12, color: "var(--ink-dim)" }}>
              {t("dashboard.lastAnalysis", lang)} {new Date(report.analyzed_at).toLocaleDateString(localeFor(lang))}
            </span>
          </div>

          {Object.entries(report.summary?.scores || {}).map(([key, val]) => (
            <div key={key} style={{ display: "grid", gridTemplateColumns: "130px 1fr 34px", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{t(`skill.${key}`, lang)}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${val}%` }} />
              </div>
              <span className="mono" style={{ fontSize: 12.5, color: "var(--ink-soft)", textAlign: "left" }}>{val}</span>
            </div>
          ))}

          {report.summary?.note && (
            <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 18, lineHeight: 1.8 }}>
              {report.summary.note}
            </p>
          )}

          <div style={{ marginTop: 24 }}>
            <AnalyzeButton lang={lang} />
          </div>
        </div>
      )}
    </main>
  );
}