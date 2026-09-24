import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AnalyzeButton from "./AnalyzeButton";
import NavBar from "../components/NavBar";

const LABELS = {
  code_quality: "جودة الكود",
  project_structure: "بنية المشروع",
  security: "أمان وثغرات",
  primary_skill: "المهارة الأساسية",
};

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const { data: report } = await supabase
    .from("skill_reports")
    .select("*")
    .eq("profile_id", user.id)
    .order("analyzed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <>
      <NavBar />
      <main className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 40 }}>
          {profile?.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" width={52} height={52} style={{ borderRadius: "50%" }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 19 }}>
              {profile?.github_username || user.email}
            </div>
            <div className="mono" style={{ color: "var(--ink-dim)", fontSize: 13 }}>
              لوحة المطوّر
            </div>
          </div>
        </div>

        {!report && (
          <div className="card" style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, marginBottom: 10 }}>
              لسه ما حللناش مشاريعك
            </h2>
            <p style={{ color: "var(--ink-soft)", fontSize: 14.5, marginBottom: 22 }}>
              دوس على الزرار وهنقرا مشاريعك العامة على GitHub ونبني بطاقة مهارات حقيقية ليك.
            </p>
            <AnalyzeButton />
          </div>
        )}

        {report && (
          <div className="card" style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20 }}>بطاقة مهاراتك</h2>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                آخر تحليل: {new Date(report.analyzed_at).toLocaleDateString("ar-EG")}
              </span>
            </div>

            {Object.entries(report.summary?.scores || {}).map(([key, val]) => (
              <div key={key} style={{ display: "grid", gridTemplateColumns: "130px 1fr 34px", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{LABELS[key] || key}</span>
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
              <AnalyzeButton />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
