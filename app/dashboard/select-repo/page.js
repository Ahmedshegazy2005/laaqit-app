import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "../../components/NavBar";
import SelectRepoButton from "./SelectRepoButton";

export default async function SelectRepoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile?.github_username) redirect("/dashboard");

  let repos = [];
  let fetchError = null;
  try {
    const res = await fetch(
      `https://api.github.com/users/${profile.github_username}/repos?sort=updated&per_page=30`,
      { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" }
    );
    if (!res.ok) throw new Error();
    repos = (await res.json()).filter((r) => !r.fork);
  } catch (e) {
    fetchError = "تعذّر جلب مشاريعك من GitHub. حاول تاني بعد شوية.";
  }

  return (
    <>
      <NavBar />
      <main className="wrap" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 720 }}>
        <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 24, marginBottom: 10 }}>
          اختار المشروع اللي عايز تحلله
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 14.5, marginBottom: 32 }}>
          هنحلل المشروع ده بس بالذكاء الاصطناعي ونبني بطاقة مهارات بناءً عليه.
        </p>

        {fetchError && <div className="card">{fetchError}</div>}

        {!fetchError && repos.length === 0 && (
          <div className="card">مفيش مشاريع عامة في حساب GitHub بتاعك حاليًا.</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {repos.map((r) => (
            <div key={r.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{r.name}</div>
                  <div style={{ color: "var(--ink-soft)", fontSize: 13.5, marginTop: 4 }}>
                    {r.description || "بدون وصف"}
                  </div>
                  <div className="mono" style={{ color: "var(--ink-dim)", fontSize: 12, marginTop: 6 }}>
                    {r.language || "—"} · ⭐ {r.stargazers_count}
                  </div>
                </div>
              </div>
              <SelectRepoButton repoFullName={r.full_name} />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
