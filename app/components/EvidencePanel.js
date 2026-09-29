function Badge({ ok, label }) {
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        padding: "4px 10px",
        borderRadius: 20,
        border: "1px solid var(--line)",
        color: ok ? "var(--scout)" : "var(--ink-dim)",
      }}
    >
      {ok ? "✓" : "—"} {label}
    </span>
  );
}

export default function EvidencePanel({ evidence }) {
  if (!evidence) return null;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="mono" style={{ color: "var(--signal)", fontSize: 12.5, marginBottom: 14 }}>
        الأدلة الفعلية من المشروع
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Badge ok={evidence.has_tests} label="اختبارات (Tests)" />
        <Badge ok={evidence.has_ci} label="CI/CD" />
        <Badge ok={evidence.has_readme} label="README" />
        <Badge ok={evidence.has_docs_folder} label="مجلد توثيق" />
      </div>

      {evidence.frameworks_detected?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, color: "var(--ink-dim)", marginBottom: 6 }}>المكتبات المكتشفة</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {evidence.frameworks_detected.slice(0, 10).map((f) => (
              <span
                key={f}
                className="mono"
                style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 20, background: "var(--bg-3)", color: "var(--ink-soft)" }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mono" style={{ fontSize: 12, color: "var(--ink-dim)", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span>ملفات: {evidence.files_scanned ?? "—"}</span>
        <span>Commits تقريبًا: {evidence.total_commits_approx ?? "غير معروف"}</span>
        <span>
          آخر تحديث:{" "}
          {evidence.last_commit_date
            ? new Date(evidence.last_commit_date).toLocaleDateString("ar-EG")
            : "غير معروف"}
        </span>
      </div>
    </div>
  );
}
