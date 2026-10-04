"use client";

import { useState } from "react";
import Link from "next/link";
import NavBar from "../components/NavBar";

const LABELS = {
  code_quality: "Code quality",
  project_structure: "Project structure",
  security: "Security",
  primary_skill: "Primary skill",
};

export default function TryPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  async function runAnalysis() {
    if (code.trim().length < 30) {
      setErrorMsg("Paste a bit more code so we can actually analyze it (at least 30 characters).");
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
      if (!res.ok) throw new Error(json.error || "Something went wrong");
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
          Quick try · no sign-in
        </div>
        <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, marginBottom: 12 }}>
          Paste code, see the analysis instantly
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 15, marginBottom: 24 }}>
          No GitHub, no account needed. Paste any code (any language) and get a quick assessment. This result is temporary and isn't saved.
        </p>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code here..."
          rows={12}
          style={{ width: "100%", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13.5, marginBottom: 16, resize: "vertical" }}
        />

        <button onClick={runAnalysis} disabled={loading} className="btn btn-signal">
          {loading ? "Analyzing…" : "Analyze this code"}
        </button>

        {errorMsg && (
          <div className="mono" style={{ color: "#e5654f", fontSize: 13, marginTop: 14 }}>
            {errorMsg}
          </div>
        )}

        {result && (
          <div className="card" style={{ marginTop: 28 }}>
            {Object.entries(result.scores || {}).map(([key, val]) => (
              <div key={key} style={{ display: "grid", gridTemplateColumns: "150px 1fr 34px", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{LABELS[key] || key}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${val}%` }} />
                </div>
                <span className="mono" style={{ fontSize: 12.5, color: "var(--ink-soft)", textAlign: "left" }}>{val}</span>
              </div>
            ))}

            {result.issues?.length > 0 && (
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="mono" style={{ fontSize: 12.5, color: "#e5654f" }}>
                  Specific issues found
                </div>
                {result.issues.map((iss, i) => (
                  <div key={i} style={{ fontSize: 13.5, color: "var(--ink-soft)", borderInlineStart: "2px solid #e5654f", paddingInlineStart: 10 }}>
                    <div>{iss.description}</div>
                  </div>
                ))}
              </div>
            )}

            {result.note && (
              <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 18, lineHeight: 1.8 }}>{result.note}</p>
            )}
            <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
              <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 12 }}>
                Liked the analysis? Sign in with GitHub to analyze your real projects and get a shareable skill card.
              </p>
              <Link href="/login" className="btn btn-scout">Sign in with GitHub</Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
