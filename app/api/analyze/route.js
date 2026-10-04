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
