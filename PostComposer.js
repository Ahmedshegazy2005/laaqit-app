"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function PostComposer() {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function publish(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    const { error } = await supabase.from("posts").insert({ profile_id: user.id, content: content.trim() });
    if (error) setError(error.message); else { setContent(""); router.refresh(); }
    setBusy(false);
  }

  return <form className="card composer" onSubmit={publish}>
    <h2>إيه الجديد؟</h2>
    <textarea value={content} onChange={e => setContent(e.target.value)} maxLength={2000} placeholder="شارك حاجة مفيدة، مشروع جديد، أو فكرة مع مجتمع لاقط..." />
    <div className="composer-footer"><span>{content.length}/2000</span><button className="btn btn-signal" disabled={busy || !content.trim()}>{busy ? "جارٍ النشر..." : "نشر البوست"}</button></div>
    {error && <p className="form-error">حصل خطأ: {error}</p>}
  </form>;
}
