"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SelectRepoButton({ repoFullName }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const router = useRouter();

  async function runAnalysis() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repoFullName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "حصل خطأ");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setErrorMsg(e.message);
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={runAnalysis} disabled={loading} className="btn btn-signal" style={{ width: "100%", justifyContent: "center" }}>
        {loading ? "جاري التحليل…" : "حلّل المشروع ده"}
      </button>
      {errorMsg && (
        <div className="mono" style={{ color: "#e5654f", fontSize: 12.5, marginTop: 8 }}>
          {errorMsg}
        </div>
      )}
    </div>
  );
}
