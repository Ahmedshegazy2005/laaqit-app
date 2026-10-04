import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NavBar from "../components/NavBar";
import EvidencePanel from "../components/EvidencePanel";

const LABELS = {
  code_quality: "Code quality",
  project_structure: "Project structure",
  security: "Security",
  primary_skill: "Primary skill",
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
              Developer dashboard
            </div>
          </div>
        </div>

        {!report && (
          <div className="card" style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, marginBottom: 10 }}>
              No analysis yet
            </h2>
            <p style={{ color: "var(--ink-soft)", fontSize: 14.5, marginBottom: 22 }}>
              Pick one of your GitHub projects and we'll analyze it with AI and build a real skill card for you.
            </p>
            <Link href="/dashboard/select-repo" className="btn btn-signal">Pick a project to analyze</Link>
          </div>
        )}

        {report && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20 }}>Your skill card</h2>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                Last analyzed: {new Date(report.analyzed_at).toLocaleDateString("en-US")}
              </span>
            </div>

            {Object.entries(report.summary?.scores || {}).map(([key, val]) => (
              <div key={key} style={{ display: "grid", gridTemplateColumns: "150px 1fr 34px", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{LABELS[key] || key}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${val}%` }} />
                </div>
                <span className="mono" style={{ fontSize: 12.5, color: "var(--ink-soft)", textAlign: "left" }}>{val}</span>
              </div>
            ))}

            {report.summary?.issues?.length > 0 && (
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="mono" style={{ fontSize: 12.5, color: "var(--danger, #e5654f)" }}>
                  Specific issues found
                </div>
                {report.summary.issues.map((iss, i) => (
                  <div key={i} style={{ fontSize: 13.5, color: "var(--ink-soft)", borderInlineStart: "2px solid #e5654f", paddingInlineStart: 10 }}>
                    <span className="mono" style={{ color: "var(--ink-dim)", fontSize: 11.5 }}>{iss.file}</span>
                    <div>{iss.description}</div>
                  </div>
                ))}
              </div>
            )}

            {report.summary?.note && (
              <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 18, lineHeight: 1.8 }}>
                {report.summary.note}
              </p>
            )}

            <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/dashboard/select-repo" className="btn btn-signal">Analyze another project</Link>
              {profile?.github_username && (
                <Link href={`/u/${profile.github_username}`} className="btn btn-scout" target="_blank">
                  Share your card 🔗
                </Link>
              )}
            </div>
          </div>
        )}

        {report?.summary?.evidence && <EvidencePanel evidence={report.summary.evidence} />}
      </main>
    </>
  );
}
