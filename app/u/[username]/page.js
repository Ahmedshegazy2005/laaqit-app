import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "../../components/NavBar";
import EvidencePanel from "../../components/EvidencePanel";

const LABELS = {
  code_quality: "Code quality",
  project_structure: "Project structure",
  security: "Security",
  primary_skill: "Primary skill",
};

export default async function PublicProfilePage({ params }) {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("github_username", params.username)
    .single();

  if (!profile) notFound();

  const { data: report } = await supabase
    .from("skill_reports")
    .select("*")
    .eq("profile_id", profile.id)
    .order("analyzed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <>
      <NavBar />
      <main className="wrap" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          {profile.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" width={64} height={64} style={{ borderRadius: "50%" }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 22 }}>{profile.github_username}</div>
            <div className="mono" style={{ color: "var(--ink-dim)", fontSize: 13 }}>
              Skill card — Laaqit
            </div>
          </div>
        </div>

        {!report && (
          <div className="card">This developer hasn't analyzed any projects yet.</div>
        )}

        {report && (
          <>
            <div className="card">
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
                  <div className="mono" style={{ fontSize: 12.5, color: "#e5654f" }}>
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
            </div>

            {report.summary?.evidence && <EvidencePanel evidence={report.summary.evidence} />}
          </>
        )}
      </main>
    </>
  );
}
