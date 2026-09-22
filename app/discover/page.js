import { createAdminClient } from "@/lib/supabase/server";

export default async function DiscoverPage() {
  const admin = createAdminClient();

  const { data: reports } = await admin
    .from("skill_reports")
    .select("*, profiles(github_username, avatar_url)")
    .order("analyzed_at", { ascending: false })
    .limit(30);

  return (
    <main className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, marginBottom: 8 }}>
        اكتشف مطورين
      </h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 36 }}>
        مطورين اتحلل الكود بتاعهم فعليًا على لاقط، مرتبين من الأحدث تحليلًا.
      </p>

      {(!reports || reports.length === 0) && (
        <div className="card">لسه مفيش مطورين اتحللوا. ارجع بعد شوية.</div>
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
            </div>
            {Object.entries(r.summary?.scores || {}).slice(0, 2).map(([key, val]) => (
              <div key={key} style={{ display: "grid", gridTemplateColumns: "90px 1fr 28px", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{key}</span>
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
