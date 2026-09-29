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

function ghHeaders(accept = "application/vnd.github+json") {
  const headers = { Accept: accept };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

async function getTreePaths(fullName, branch) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${fullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      { headers: ghHeaders() }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.tree || []).filter((item) => item.type === "blob").map((item) => item.path);
  } catch (e) {
    return [];
  }
}

function classifyPaths(paths) {
  const testFiles = paths.filter((p) => {
    const lp = p.toLowerCase();
    return (
      lp.includes("__tests__") ||
      lp.includes("/test/") ||
      lp.includes("/tests/") ||
      lp.includes("/spec/") ||
      /\.(test|spec)\.[jt]sx?$/.test(lp) ||
      lp.includes("test_")
    );
  });

  const ciFiles = paths.filter((p) => {
    const lp = p.toLowerCase();
    return (
      lp.startsWith(".github/workflows/") ||
      lp === ".gitlab-ci.yml" ||
      lp.startsWith(".circleci/") ||
      lp === "jenkinsfile"
    );
  });

  const knownManifests = [
    "package.json",
    "requirements.txt",
    "pipfile",
    "gemfile",
    "pom.xml",
    "go.mod",
    "composer.json",
    "cargo.toml",
  ];
  const dependencyFiles = paths.filter((p) => knownManifests.includes(p.toLowerCase()));
  const hasDocsFolder = paths.some((p) => p.toLowerCase().startsWith("docs/"));

  return { testFiles, ciFiles, dependencyFiles, hasDocsFolder, totalFiles: paths.length };
}

async function getFrameworksFromPackageJson(fullName) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${fullName}/contents/package.json`,
      { headers: ghHeaders("application/vnd.github.raw+json") }
    );
    if (!res.ok) return [];
    const text = await res.text();
    const json = JSON.parse(text);
    const deps = Object.keys({ ...(json.dependencies || {}), ...(json.devDependencies || {}) });
    return deps.slice(0, 20);
  } catch (e) {
    return [];
  }
}

async function getCommitStats(fullName) {
  try {
    const res = await fetch(`https://api.github.com/repos/${fullName}/commits?per_page=1`, {
      headers: ghHeaders(),
    });
    if (!res.ok) return { lastCommitDate: null, totalCommitsApprox: null };
    const json = await res.json();
    const lastCommitDate = json[0]?.commit?.author?.date || null;
    const link = res.headers.get("link") || "";
    const match = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
    const totalCommitsApprox = match ? parseInt(match[1], 10) : json.length;
    return { lastCommitDate, totalCommitsApprox };
  } catch (e) {
    return { lastCommitDate: null, totalCommitsApprox: null };
  }
}

async function gatherEvidence(repo) {
  const paths = await getTreePaths(repo.full_name, repo.default_branch);
  const classified = classifyPaths(paths);

  let frameworks = [];
  if (classified.dependencyFiles.map((f) => f.toLowerCase()).includes("package.json")) {
    frameworks = await getFrameworksFromPackageJson(repo.full_name);
  }

  const commitStats = await getCommitStats(repo.full_name);

  let readme = "";
  try {
    const readmeRes = await fetch(`https://api.github.com/repos/${repo.full_name}/readme`, {
      headers: ghHeaders("application/vnd.github.raw+json"),
    });
    if (readmeRes.ok) readme = (await readmeRes.text()).slice(0, 3000);
  } catch (e) {}

  return {
    evidence: {
      files_scanned: classified.totalFiles,
      has_tests: classified.testFiles.length > 0,
      test_files_sample: classified.testFiles.slice(0, 5),
      has_ci: classified.ciFiles.length > 0,
      ci_files: classified.ciFiles.slice(0, 5),
      has_docs_folder: classified.hasDocsFolder,
      has_readme: !!readme,
      dependency_files: classified.dependencyFiles,
      frameworks_detected: frameworks,
      last_commit_date: commitStats.lastCommitDate,
      total_commits_approx: commitStats.totalCommitsApprox,
      language: repo.language,
      stars: repo.stargazers_count,
    },
    readme,
  };
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

    let scores;
    let reposAnalyzedNames;

    if (targetRepo) {
      // المسار الجديد: تحليل مبني على أدلة حقيقية من المشروع
      const repoRes = await fetch(`https://api.github.com/repos/${targetRepo}`, {
        headers: ghHeaders(),
      });
      if (!repoRes.ok) throw userError("تعذّر جلب المشروع المطلوب");
      const repo = await repoRes.json();

      const { evidence, readme } = await gatherEvidence(repo);

      const prompt = buildEvidencePrompt(profile.github_username, repo, evidence, readme);
      const aiResult = await callGemini(prompt);

      scores = { ...aiResult, evidence };
      reposAnalyzedNames = [repo.name];
    } else {
      // سلوك احتياطي قديم: أحدث 3 مشاريع، بدون جمع أدلة عميقة
      const reposRes = await fetch(
        `https://api.github.com/users/${profile.github_username}/repos?sort=updated&per_page=6`,
        { headers: ghHeaders() }
      );
      if (!reposRes.ok) throw userError("تعذّر جلب مشاريع GitHub");
      const repos = (await reposRes.json()).filter((r) => !r.fork).slice(0, 3);

      if (repos.length === 0) throw userError("مفيش مشاريع نقدر نحللها");

      const repoSummaries = await Promise.all(
        repos.map(async (r) => {
          let readme = "";
          try {
            const readmeRes = await fetch(`https://api.github.com/repos/${r.full_name}/readme`, {
              headers: ghHeaders("application/vnd.github.raw+json"),
            });
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

      scores = await callGemini(buildLegacyPrompt(profile.github_username, repoSummaries));
      reposAnalyzedNames = repoSummaries.map((r) => r.name);
    }

    const { error: insertError } = await admin.from("skill_reports").insert({
      profile_id: user.id,
      summary: scores,
      repos_analyzed: reposAnalyzedNames,
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

function buildEvidencePrompt(username, repo, evidence, readme) {
  return `أنت مقيّم تقني محايد ودقيق جدًا. مهم جدًا: لا تخترع أي معلومة غير موجودة في الأدلة تحت. لو نقطة معينة مفيش عليها دليل واضح، وضّح ده في الملاحظة بدل ما تدّي درجة عالية أو منخفضة بلا سبب.

معلومات المشروع "${repo.name}" لمطوّر اسمه ${username}:

الوصف: ${repo.description || "لا يوجد"}
اللغة الأساسية: ${evidence.language || "غير محدد"}
عدد النجوم: ${evidence.stars}
عدد الملفات اللي تم فحصها: ${evidence.files_scanned}
وجود اختبارات: ${evidence.has_tests ? "نعم — أمثلة: " + evidence.test_files_sample.join(", ") : "لا يوجد دليل على اختبارات"}
وجود CI/CD: ${evidence.has_ci ? "نعم — ملفات: " + evidence.ci_files.join(", ") : "لا يوجد"}
وجود مجلد توثيق (docs): ${evidence.has_docs_folder ? "نعم" : "لا"}
وجود README: ${evidence.has_readme ? "نعم" : "لا"}
ملفات تبعيات موجودة: ${evidence.dependency_files.join(", ") || "لا يوجد"}
مكتبات/أطر مكتشفة: ${evidence.frameworks_detected.join(", ") || "غير معروف"}
تاريخ آخر تحديث (commit): ${evidence.last_commit_date || "غير معروف"}
عدد الـ commits التقريبي: ${evidence.total_commits_approx ?? "غير معروف"}

محتوى README (لو موجود):
${readme || "لا يوجد"}

رجّع تقييمك بصيغة JSON فقط، بدون أي نص إضافي قبله أو بعده، بالشكل ده بالظبط:
{
  "scores": {
    "code_quality": <رقم من 0 إلى 100>,
    "project_structure": <رقم من 0 إلى 100>,
    "security": <رقم من 0 إلى 100>,
    "primary_skill": <رقم من 0 إلى 100>
  },
  "note": "<فقرة قصيرة بالعربي تشرح كل درجة بناءً على الأدلة الفعلية بس، وتقول صراحة 'بيانات غير كافية للحكم على هذه النقطة' لو مفيش دليل واضح على حاجة معينة (زي الاختبارات مثلاً)>"
}`;
}

function buildLegacyPrompt(username, repos) {
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
    "primary_skill": <رقم من 0 إلى 100>
  },
  "note": "<جملتين أو ثلاثة بالعربي تلخص نقاط القوة والضعف الرئيسية>"
}`;
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
