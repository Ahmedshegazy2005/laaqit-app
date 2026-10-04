import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const PER_USER_DAILY_LIMIT = 10;
const GLOBAL_DAILY_LIMIT = 300;
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const CODE_EXT = /\.(js|jsx|ts|tsx|py|java|rb|go|php|cs|cpp|c|kt|swift)$/i;
const EXCLUDE_PATH = /(node_modules|dist\/|build\/|vendor\/|\.min\.js|package-lock\.json|yarn\.lock)/i;

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

async function getTreeItems(fullName, branch) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${fullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      { headers: ghHeaders() }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.tree || []).filter((item) => item.type === "blob");
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
    const res = await fetch(`https://api.github.com/repos/${fullName}/contents/package.json`, {
      headers: ghHeaders("application/vnd.github.raw+json"),
    });
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

async function getSampleFileContents(fullName, items) {
  const candidates = items
    .filter((i) => CODE_EXT.test(i.path) && !EXCLUDE_PATH.test(i.path))
    .sort((a, b) => (b.size || 0) - (a.size || 0))
    .slice(0, 3);

  const samples = await Promise.all(
    candidates.map(async (item) => {
      try {
        const res = await fetch(`https://api.github.com/repos/${fullName}/contents/${item.path}`, {
          headers: ghHeaders("application/vnd.github.raw+json"),
        });
        if (!res.ok) return null;
        const content = (await res.text()).slice(0, 2500);
        return { path: item.path, content };
      } catch (e) {
        return null;
      }
    })
  );

  return samples.filter(Boolean);
}

async function gatherEvidence(repo) {
  const items = await getTreeItems(repo.full_name, repo.default_branch);
  const paths = items.map((i) => i.path);
  const classified = classifyPaths(paths);

  let frameworks = [];
  if (classified.dependencyFiles.map((f) => f.toLowerCase()).includes("package.json")) {
    frameworks = await getFrameworksFromPackageJson(repo.full_name);
  }

  const commitStats = await getCommitStats(repo.full_name);
  const sampleFiles = await getSampleFileContents(repo.full_name, items);

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
      files_sampled: sampleFiles.map((s) => s.path),
    },
    readme,
    sampleFiles,
  };
}

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You need to sign in first" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).single();

  if (!profile?.github_username) {
    return NextResponse.json({ error: "No GitHub account connected" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const targetRepo = body.repo;

  if (targetRepo !== undefined && targetRepo !== null) {
    if (typeof targetRepo !== "string" || !REPO_PATTERN.test(targetRepo)) {
      return NextResponse.json({ error: "Invalid project name." }, { status: 400 });
    }
    const owner = targetRepo.split("/")[0].toLowerCase();
    if (owner !== profile.github_username.toLowerCase()) {
      return NextResponse.json({ error: "You can only analyze your own projects." }, { status: 403 });
    }
  }

  try {
    const userCount = await hit(admin, `user:${user.id}`);
    if (userCount > PER_USER_DAILY_LIMIT) {
      return NextResponse.json(
        { error: "You've hit today's analysis limit (10). Come back tomorrow." },
        { status: 429 }
      );
    }

    const globalCount = await hit(admin, "global");
    if (globalCount > GLOBAL_DAILY_LIMIT) {
      return NextResponse.json(
        { error: "Analysis has hit its daily limit across all users. Come back tomorrow." },
        { status: 429 }
      );
    }

    let scores;
    let reposAnalyzedNames;

    if (targetRepo) {
      const repoRes = await fetch(`https://api.github.com/repos/${targetRepo}`, {
        headers: ghHeaders(),
      });
      if (!repoRes.ok) throw userError("Couldn't fetch the requested project");
      const repo = await repoRes.json();

      const { evidence, readme, sampleFiles } = await gatherEvidence(repo);

      const prompt = buildEvidencePrompt(profile.github_username, repo, evidence, readme, sampleFiles);
      const aiResult = await callGemini(prompt);

      scores = { ...aiResult, evidence };
      reposAnalyzedNames = [repo.name];
    } else {
      const reposRes = await fetch(
        `https://api.github.com/users/${profile.github_username}/repos?sort=updated&per_page=6`,
        { headers: ghHeaders() }
      );
      if (!reposRes.ok) throw userError("Couldn't fetch your GitHub projects");
      const repos = (await reposRes.json()).filter((r) => !r.fork).slice(0, 3);

      if (repos.length === 0) throw userError("No projects available to analyze");

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
      { error: e.userFacing ? e.message : "A temporary error occurred. Try again in a bit." },
      { status: 500 }
    );
  }
}

function buildEvidencePrompt(username, repo, evidence, readme, sampleFiles) {
  const samplesText = sampleFiles.length
    ? sampleFiles.map((s) => `--- File: ${s.path} ---\n${s.content}`).join("\n\n")
    : "No suitable code files found to display.";

  return `You are a neutral, precise technical reviewer. Never invent information not present in the evidence below. If there isn't clear evidence for a point, say so instead of giving a random score.

Project "${repo.name}" info, for a developer named ${username}:

Description: ${repo.description || "none"}
Primary language: ${evidence.language || "unspecified"}
File count: ${evidence.files_scanned}
Tests present: ${evidence.has_tests ? "yes" : "no clear evidence"}
CI/CD present: ${evidence.has_ci ? "yes" : "no"}
README present: ${evidence.has_readme ? "yes" : "no"}
Detected libraries: ${evidence.frameworks_detected.join(", ") || "unknown"}
Last update: ${evidence.last_commit_date || "unknown"}

README content:
${readme || "none"}

Sample of the largest actual code files in the project (read carefully and flag any real issues):
${samplesText}

Respond in JSON only, no extra text, respond in English, exactly in this shape:
{
  "scores": {
    "code_quality": <number 0-100>,
    "project_structure": <number 0-100>,
    "security": <number 0-100>,
    "primary_skill": <number 0-100>
  },
  "issues": [
    { "file": "<file name>", "description": "<a real issue you found in this specific file, in English>" }
  ],
  "note": "<a short paragraph explaining the scores based on the evidence, and saying 'insufficient evidence' for any point with no clear evidence>"
}

Important: "issues" must be real problems you found in the file content shown above only, never guesses. If no code files are available or no clear issues exist, return an empty array [].`;
}

function buildLegacyPrompt(username, repos) {
  const repoText = repos
    .map(
      (r) =>
        `### ${r.name}\nLanguage: ${r.language || "unspecified"} | Stars: ${r.stars}\nDescription: ${r.description || "none"}\nREADME:\n${r.readme || "no README"}`
    )
    .join("\n\n");

  return `You are a neutral technical reviewer. Based on these projects from a developer named ${username}'s GitHub account, assess their skills.

${repoText}

Respond in JSON only, in English, exactly in this shape:
{
  "scores": {
    "code_quality": <number 0-100>,
    "project_structure": <number 0-100>,
    "security": <number 0-100>,
    "primary_skill": <number 0-100>
  },
  "issues": [],
  "note": "<two or three sentences in English summarizing the main strengths and weaknesses>"
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
    throw userError(`AI analysis failed: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw userError("Unexpected response from the analysis model");

  return JSON.parse(text);
}
