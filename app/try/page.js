"use client";

import { useState } from "react";
import Link from "next/link";
import NavBar from "../components/NavBar";

const LABELS = {
  code_quality: "جودة الكود",
  project_structure: "بنية المشروع",
  security: "أمان وثغرات",
  primary_skill: "المهارة الأساسية",
};

export default function TryPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  async function runAnalysis() {
    if (code.trim().length < 30) {
      setErrorMsg("الصق كود أطول شوية عشان نقدر نحلله كويس (30 حرف على الأقل).");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setResult(null);
    try {
      const res = await fetch("/api/try-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "حصل خطأ");
      setResult(json.scores);
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <NavBar />
      <main className="wrap" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 720 }}>
        <div className="mono" style={{ color: "var(--signal)", fontSize: 13, marginBottom: 12 }}>
          تجربة سريعة · من غير تسجيل دخول
        </div>
        <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, marginBottom: 12 }}>
          الصق كود وشوف تحليله فورًا
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 15, marginBottom: 24 }}>
          مش لازم GitHub ولا حساب. الصق أي كود عندك (أي لغة) وهنديك تقييم سريع. النتيجة دي مؤقتة ومش بتتحفظ.
        </p>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="الصق الكود هنا..."
          rows={12}
          style={{ width: "100%", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13.5, marginBottom: 16, resize: "vertical" }}
        />

        <button onClick={runAnalysis} disabled={loading} className="btn btn-signal">
          {loading ? "جاري التحليل…" : "حلّل الكود ده"}
        </button>

        {errorMsg && (
          <div className="mono" style={{ color: "#e5654f", fontSize: 13, marginTop: 14 }}>
            {errorMsg}
          </div>
        )}

        {result && (
          <div className="card" style={{ marginTop: 28 }}>
            {Object.entries(result.scores || {}).map(([key, val]) => (
              <div key={key} style={{ display: "grid", gridTemplateColumns: "130px 1fr 34px", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{LABELS[key] || key}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${val}%` }} />
                </div>
                <span className="mono" style={{ fontSize: 12.5, color: "var(--ink-soft)", textAlign: "left" }}>{val}</span>
              </div>
            ))}
            {result.note && (
              <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 18, lineHeight: 1.8 }}>{result.note}</p>
            )}
            <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
              <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 12 }}>
                عجبك التحليل؟ سجّل بحساب GitHub عشان تحلل مشاريعك الحقيقية وتاخد بطاقة قابلة للمشاركة.
              </p>
              <Link href="/login" className="btn btn-scout">سجّل دخول بحساب GitHub</Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
