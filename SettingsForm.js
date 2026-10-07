"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SettingsForm({ user, profile }) {
  const supabase = createClient(); const router = useRouter();
  const [form, setForm] = useState({ display_name: profile?.display_name || profile?.github_username || "", bio: profile?.bio || "", website: profile?.website || "" });
  const [avatar, setAvatar] = useState(profile?.avatar_url || user.user_metadata?.avatar_url || "");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");

  async function save(e) {
    e.preventDefault(); setBusy(true); setMessage(""); setError("");
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    if (error) setError(error.message); else { setMessage("تم حفظ التعديلات ✓"); router.refresh(); }
    setBusy(false);
  }

  async function upload(e) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) return setError("اختار صورة فقط.");
    if (file.size > 3 * 1024 * 1024) return setError("حجم الصورة لازم يكون أقل من 3MB.");
    setBusy(true); setError("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) { setError(uploadError.message); setBusy(false); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: dbError } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    if (dbError) setError(dbError.message); else { setAvatar(data.publicUrl); setMessage("تم تغيير صورة البروفايل ✓"); router.refresh(); }
    setBusy(false);
  }

  async function logout() { await supabase.auth.signOut(); router.push("/"); router.refresh(); }

  return <><div className="social-topbar"><Link href="/social" className="brand">لاقط</Link><nav><Link href="/social">المجتمع</Link><Link href="/dashboard">التحليل</Link><Link href={`/profile/${user.id}`}>ملفي</Link></nav></div>
    <div className="card settings-card"><div className="settings-title"><div><div className="mono" style={{ color: "var(--signal)" }}>ACCOUNT / SETTINGS</div><h1>إعدادات الحساب</h1><p>عدّل بياناتك وصورة البروفايل في أي وقت.</p></div></div>
      <div className="avatar-setting"><img className="avatar" src={avatar || ""} alt="" width="96" height="96" style={{ width: 96, height: 96 }} /><label className="btn btn-ghost">تغيير الصورة<input type="file" accept="image/*" onChange={upload} hidden /></label></div>
      <form onSubmit={save} className="settings-form">
        <label>الاسم<input value={form.display_name} onChange={e => setForm({...form, display_name:e.target.value})} maxLength={80} /></label>
        <label>Bio<textarea value={form.bio} onChange={e => setForm({...form, bio:e.target.value})} maxLength={300} placeholder="اكتب نبذة قصيرة عنك..." /></label>
        <label>الموقع الشخصي<input value={form.website} onChange={e => setForm({...form, website:e.target.value})} placeholder="https://..." /></label>
        <label>GitHub username<input value={profile?.github_username || ""} disabled /></label>
        <div className="settings-actions"><button className="btn btn-signal" disabled={busy}>{busy ? "جارٍ الحفظ..." : "حفظ التعديلات"}</button><button type="button" className="btn btn-ghost" onClick={logout}>تسجيل الخروج</button></div>
        {message && <p className="success">{message}</p>}{error && <p className="form-error">{error}</p>}
      </form>
    </div></>;
}
