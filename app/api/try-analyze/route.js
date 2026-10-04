import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

const MAX_CHARS = 8000;
const PER_PERSON_DAILY_LIMIT = 5;
const GLOBAL_DAILY_LIMIT = 300;

function getPersonBucket(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || "unknown";
  const key = process.env.SUPABASE_SECRET_KEY || "fallback";
  return "ip:" + createHmac("sha256", key).update(ip).digest("hex").slice(0, 32);
}

async function hit(admin, bucket) {
  const { data, error } = await admin.rpc("increment_try_usage", { p_bucket: bucket });
  if (error) throw error;
  return data;
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const code = (body.code || "").toString().slice(0, MAX_CHARS);

  if (code.trim().length < 30) {
    return NextResponse.json({ error: "Code is too short to analyze." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    const personCount = await hit(admin, getPersonBucket(request));
    if (personCount > PER_PERSON_DAILY_LIMIT) {
      return NextResponse.json(
        { error: "You've hit today's quick-try limit (5). Come back tomorrow, or sign in and analyze a real GitHub project." },
        { status: 429 }
      );
    }

    const globalCount = await hit(admin, "global");
    if (globalCount > GLOBAL_DAILY_LIMIT) {
      return NextResponse.json(
        { error: "Quick-try analysis has hit its daily limit across all users. Come back tomorrow." },
        { status: 429 }
      );
    }

    const scores = await callGemini(buildPrompt(code));
    return NextResponse.json({ ok: true, scores });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e.userFacing ? e.message : "A temporary error occurred. Try again in a bit." },
      { status: 500 }
    );
  }
}

function buildPrompt(code) {
  return `You are a neutral technical reviewer. Assess this code snippet pasted by a user for a quick try (no full project context), and read it carefully to flag any real issues.

Code:
\`\`\`
${code}
\`\`\`

Respond in JSON only, in English, exactly in this shape:
{
  "scores": {
    "code_quality": <number 0-100>,
    "project_structure": <number 0-100>,
    "security": <number 0-100>,
    "primary_skill": <number 0-100>
  },
  "issues": [
    { "file": "Pasted code", "description": "<a real issue you found in this code, in English>" }
  ],
  "note": "<two or three sentences in English summarizing strengths and weaknesses, noting this is a quick assessment of a snippet only>"
}

Important: "issues" must be real problems you found in the code, never guesses. If there are no clear issues, return an empty array [].`;
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
    const err = new Error(`AI analysis failed: ${errText.slice(0, 200)}`);
    err.userFacing = true;
    throw err;
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const err = new Error("Unexpected response from the analysis model");
    err.userFacing = true;
    throw err;
  }

  return JSON.parse(text);
}
