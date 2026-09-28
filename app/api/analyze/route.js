import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const PER_USER_DAILY_LIMIT = 10;
const GLOBAL_DAILY_LIMIT = 300;
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function userError(message) {
  const err = new Error(message);
  err.userFacing = true;
  return err;
}

async function hit(admin, bucket) {
  const { data, error } = await admin.rpc("increment_try_usage", { p_bucket: bucket });
  if (error) throw error;
  return data;
}

export async function POST(request) {
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

  const body = await request.json().catch(() => ({}));
  const targetRepo = body.repo;

  if (targetRepo !== undefined && targetRepo !== null) {
    if (typeof targetRepo !== "string" || !REPO_PATTERN.test(targetRepo)) {
      return NextResponse.json({ error: "اسم المشروع مش صحيح." }, { status: 400 });
    }
    const owner = targetRepo.split("/")[0].toLowerCase();
    if (owner !== profile.github_username.toLowerCase()) {
      return NextResponse.json({ error: "تقدر تحلل مشاريع حسابك إنت بس." }, { status: 403 });
    }
  }

  try {
    const userCount = await hit(admin, `user:${user.id}`);
    if (userCount > PER_USER_DAILY_LIMIT) {
      return NextResponse.json(
        { error: "وصلت للحد اليومي للتحليل (10 مرات). ارجع بكرة." },
        { status: 429 }
      );
    }

    const globalCount = await hit(admin, "global");
    if (globalCount > GLOBAL_DAILY_LIMIT) {
      return NextResponse.json(
        { error: "التحليل وصل لحده اليومي عند كل المستخدمين. ارجع بكرة." },
        { status: 429 }
      );
    }

    let repos = [];

    if (targetRepo) {
      const repoRes = await fetch(`https://api.github.com/repos/${targetRepo}`, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!repoRes.ok) throw userError("تعذّر جلب المشروع المطلوب");
      repos = [await repoRes.json()];
    } else {
      const reposRes = await fetch(
        `https://api.github.com/users/${profile.github_username}/repos?sort=updated&per_page=6`,
        { headers: { Accept: "application/vnd.github+json" } }
      );
      if (!reposRes.ok) throw userError("تعذّر جلب مشاريع GitHub");
      repos = (await reposRes.json()).filter((r) => !r.fork).slice(0, 3);
    }

    if (repos.length === 0) {
      return NextResponse.json({ error: "مفيش مشاريع نقدر نحللها" }, { status: 400 });
    }

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

    const prompt = buildPrompt(profile.github_username, repoSummaries);
    const scores = await callGemini(prompt);

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
    return NextResponse.json(
      { error: e.userFacing ? e.message : "حصل خطأ مؤقت. حاول تاني بعد شوية." },
      { status: 500 }
    );
  }
}

function buildPrompt(username, repos) {
  const repoText = repos
    .map(
      (r) =>
        `### ${r.name}\nاللغة: ${r.language || "غير محدد"} | نجوم: ${r.stars}\nالوصف: ${r.description || "لا يوجد"}\nREADME:\n${r.readme || "لا يوجد README"}`
    )
    .join("\n\n");

  return `أنت مقيّم تقني محايد. بناءً على المشروع/المشاريع دي من حساب GitHub الخاص بمطوّر اسمه ${username}، قيّم مهاراته.

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

قيّم بناءً على الأدلة المتاحة بس، وكن معتدل ومتحفظ لو الأدلة محدودة بدل ما تعطي درجات عالية بلا مبرر.`;
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

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
    throw userError(`فشل تحليل الذكاء الاصطناعي: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw userError("رد غير متوقع من نموذج التحليل");

  return JSON.parse(text);
}
