import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Pulls up to 3 of the user's most-recently-updated public repos,
// grabs their README + top-level file listing, and asks Gemini to
// score the developer's skills. Stores the result in `skill_reports`.
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "لازم تسجّل دخول الأول" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).single();

  if (!profile?.github_username) {
    return NextResponse.json({ error: "مفيش حساب GitHub مربوط" }, { status: 400 });
  }

  try {
    // 1) Pull public repos (no token needed for public data — more reliable
    //    than relying on the short-lived provider token from login)
    const reposRes = await fetch(
      `https://api.github.com/users/${profile.github_username}/repos?sort=updated&per_page=6`,
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (!reposRes.ok) throw new Error("تعذّر جلب مشاريع GitHub");
    const repos = (await reposRes.json())
      .filter((r) => !r.fork)
      .slice(0, 3);

    if (repos.length === 0) {
      return NextResponse.json({ error: "مفيش مشاريع عامة نقدر نحللها في حساب GitHub بتاعك" }, { status: 400 });
    }

    // 2) Grab README content for each repo (best-effort)
    const repoSummaries = await Promise.all(
      repos.map(async (r) => {
        let readme = "";
        try {
          const readmeRes = await fetch(
            `https://api.github.com/repos/${r.full_name}/readme`,
            { headers: { Accept: "application/vnd.github.raw+json" } }
          );
          if (readmeRes.ok) readme = (await readmeRes.text()).slice(0, 3000);
        } catch (e) {}
        return {
          name: r.name,
          description: r.description,
          language: r.language,
          stars: r.stargazers_count,
          readme,
        };
      })
    );

    // 3) Ask Gemini to score the developer based on this evidence
    const prompt = buildPrompt(profile.github_username, repoSummaries);
    const scores = await callGemini(prompt);

    // 4) Store the report
    const { error: insertError } = await admin.from("skill_reports").insert({
      profile_id: user.id,
      summary: scores,
      repos_analyzed: repoSummaries.map((r) => r.name),
      analyzed_at: new Date().toISOString(),
    });
    if (insertError) throw insertError;

    return NextResponse.json({ ok: true, scores });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "حصل خطأ غير متوقع" }, { status: 500 });
  }
}

function buildPrompt(username, repos) {
  const repoText = repos
    .map(
      (r) =>
        `### ${r.name}\nاللغة: ${r.language || "غير محدد"} | نجوم: ${r.stars}\nالوصف: ${r.description || "لا يوجد"}\nREADME:\n${r.readme || "لا يوجد README"}`
    )
    .join("\n\n");

  return `أنت مقيّم تقني محايد. بناءً على المشاريع دي من حساب GitHub الخاص بمطوّر اسمه ${username}، قيّم مهاراته.

${repoText}

رجّع تقييمك بصيغة JSON فقط، بدون أي نص إضافي قبله أو بعده، بالشكل ده بالظبط:
{
  "scores": {
    "code_quality": <رقم من 0 إلى 100>,
    "project_structure": <رقم من 0 إلى 100>,
    "security": <رقم من 0 إلى 100>,
    "primary_skill": <رقم من 0 إلى 100 يعكس قوة أقوى مهارة ظاهرة>
  },
  "note": "<جملتين أو ثلاثة بالعربي تلخص نقاط القوة والضعف الرئيسية، بأسلوب بنّاء>"
}

قيّم بناءً على الأدلة المتاحة بس (الوصف وملف README وأسماء المشاريع)، وكن معتدل ومتحفظ لو الأدلة محدودة بدل ما تعطي درجات عالية بلا مبرر.`;
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`فشل تحليل الذكاء الاصطناعي: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("رد غير متوقع من نموذج التحليل");

  return JSON.parse(text);
}
