"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";

export default function AnalyzeButton({ lang = "ar" }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const router = useRouter();

  async function runAnalysis() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/analyze", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("analyze.error", lang));
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
        {loading ? t("analyze.loading", lang) : t("analyze.button", lang)}
      </button>
      {errorMsg && (
        <div className="mono" style={{ color: "#e5654f", fontSize: 13, marginTop: 10 }}>
          {errorMsg}
        </div>
      )}
    </div>
  );
}