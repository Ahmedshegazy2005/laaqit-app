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
    return NextResponse.json({ error: "الكود قصير جدًا عشان نحلله." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    const personCount = await hit(admin, getPersonBucket(request));
    if (personCount > PER_PERSON_DAILY_LIMIT) {
      return NextResponse.json(
        { error: "وصلت للحد اليومي للتجربة السريعة (5 مرات). ارجع بكرة، أو سجّل دخول وحلّل مشروع من GitHub." },
        { status: 429 }
      );
    }

    const globalCount = await hit(admin, "global");
    if (globalCount > GLOBAL_DAILY_LIMIT) {
      return NextResponse.json(
        { error: "التجربة السريعة وصلت لحدها اليومي عند كل المستخدمين. ارجع بكرة." },
        { status: 429 }
      );
    }

    const scores = await callGemini(buildPrompt(code));
    return NextResponse.json({ ok: true, scores });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e.userFacing ? e.message : "حصل خطأ مؤقت. حاول تاني بعد شوية." },
      { status: 500 }
    );
  }
}

function buildPrompt(code) {
  return `أنت مقيّم تقني محايد. قيّم مقتطف الكود ده اللي لصقه مستخدم لتجربة سريعة (من غير سياق مشروع كامل)، واقرأه بعناية عشان تحدد أي مشاكل حقيقية فيه.

الكود:
\`\`\`
${code}
\`\`\`

رجّع تقييمك بصيغة JSON فقط، بدون أي نص إضافي، بالشكل ده بالظبط:
{
  "scores": {
    "code_quality": <رقم من 0 إلى 100>,
    "project_structure": <رقم من 0 إلى 100>,
    "security": <رقم من 0 إلى 100>,
    "primary_skill": <رقم من 0 إلى 100>
  },
  "issues": [
    { "file": "الكود الملصوق", "description": "<وصف مشكلة حقيقية وجدتها في الكود ده تحديدًا، بالعربي>" }
  ],
  "note": "<جملتين أو ثلاثة بالعربي تلخص نقاط القوة والضعف، وتوضح إن ده تقييم أولي على مقتطف بس>"
}

مهم: "issues" لازم تكون مشاكل حقيقية شفتها في الكود بس، مش تخمين. لو مفيش مشاكل واضحة، رجّع مصفوفة فاضية [].`;
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
    const err = new Error(`فشل تحليل الذكاء الاصطناعي: ${errText.slice(0, 200)}`);
    err.userFacing = true;
    throw err;
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const err = new Error("رد غير متوقع من نموذج التحليل");
    err.userFacing = true;
    throw err;
  }

  return JSON.parse(text);
}
