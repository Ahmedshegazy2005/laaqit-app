"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AnalyzeButton() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const router = useRouter();

  async function runAnalysis() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/analyze", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "حصل خطأ");
      router.refresh();
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={runAnalysis} disabled={loading} className="btn btn-signal">
        {loading ? "جاري التحليل…" : "حلّل مشاريعي دلوقتي"}
      </button>
      {errorMsg && (
        <div className="mono" style={{ color: "#e5654f", fontSize: 13, marginTop: 10 }}>
          {errorMsg}
        </div>
      )}
    </div>
  );
}
