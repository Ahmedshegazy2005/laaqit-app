import { NextResponse } from "next/server";

const MAX_CHARS = 8000;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const code = (body.code || "").toString().slice(0, MAX_CHARS);

  if (code.trim().length < 30) {
    return NextResponse.json({ error: "الكود قصير جدًا عشان نحلله." }, { status: 400 });
  }

  try {
    const prompt = buildPrompt(code);
    const scores = await callGemini(prompt);
    return NextResponse.json({ ok: true, scores });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "حصل خطأ غير متوقع" }, { status: 500 });
  }
}

function buildPrompt(code) {
  return `أنت مقيّم تقني محايد. قيّم مقتطف الكود ده اللي لصقه مستخدم لتجربة سريعة (من غير سياق مشروع كامل).

الكود:
\`\`\`
${code}
\`\`\`

رجّع تقييمك بصيغة JSON فقط، بدون أي نص إضافي قبله أو بعده، بالشكل ده بالظبط:
{
  "scores": {
    "code_quality": <رقم من 0 إلى 100>,
    "project_structure": <رقم من 0 إلى 100>,
    "security": <رقم من 0 إلى 100>,
    "primary_skill": <رقم من 0 إلى 100 يعكس قوة أقوى مهارة ظاهرة>
  },
  "note": "<جملتين أو ثلاثة بالعربي تلخص نقاط القوة والضعف، بأسلوب بنّاء، وبتوضيح إن ده تقييم أولي على مقتطف بس مش على مشروع كامل>"
}

كن معتدل ومتحفظ لأن ده مقتطف صغير مش مشروع كامل.`;
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
    throw new Error(`فشل تحليل الذكاء الاصطناعي: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("رد غير متوقع من نموذج التحليل");

  return JSON.parse(text);
}
