"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LEVELS } from "@/lib/levels";
import { t } from "@/lib/i18n";
import SiteBrand from "@/components/SiteBrand";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function SettingsForm({ user, profile, lang = "ar" }) {
  const supabase = createClient(); const router = useRouter();
  const [form, setForm] = useState({ display_name: profile?.display_name || profile?.github_username || "", bio: profile?.bio || "", website: profile?.website || "", level: profile?.level || "" });
  const [avatar, setAvatar] = useState(profile?.avatar_url || user.user_metadata?.avatar_url || "");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");

  async function save(e) {
    e.preventDefault(); setBusy(true); setMessage(""); setError("");
    const payload = { ...form, level: form.level || null };
    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    if (error) setError(error.message); else { setMessage(t("settings.saved", lang)); router.refresh(); }
    setBusy(false);
  }

  async function upload(e) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) return setError(t("settings.pictureError", lang));
    if (file.size > 3 * 1024 * 1024) return setError(t("settings.pictureSizeError", lang));
    setBusy(true); setError("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) { setError(uploadError.message); setBusy(false); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: dbError } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    if (dbError) setError(dbError.message); else { setAvatar(data.publicUrl); setMessage(t("settings.pictureSaved", lang)); router.refresh(); }
    setBusy(false);
  }

  async function logout() { await supabase.auth.signOut(); router.push("/"); router.refresh(); }

  return <><div className="social-topbar">
    <div className="topbar-row"><SiteBrand lang={lang} /><LanguageSwitcher lang={lang} /></div>
    <nav><Link href="/social">{t("nav.community", lang)}</Link><Link href="/dashboard">{t("nav.analysis", lang)}</Link><Link href={`/profile/${user.id}`}>{t("nav.myProfile", lang)}</Link></nav>
  </div>
  <div className="card settings-card"><div className="settings-title"><div><div className="mono" style={{ color: "var(--signal)" }}>ACCOUNT / SETTINGS</div><h1>{t("settings.title", lang)}</h1><p>{t("settings.sub", lang)}</p></div></div>
    <div className="avatar-setting"><img className="avatar" src={avatar || ""} alt="" width="96" height="96" style={{ width: 96, height: 96 }} /><label className="btn btn-ghost">{t("settings.changePicture", lang)}<input type="file" accept="image/*" onChange={upload} hidden /></label></div>
    <form onSubmit={save} className="settings-form">
      <label>{t("settings.name", lang)}<input value={form.display_name} onChange={e => setForm({...form, display_name:e.target.value})} maxLength={80} /></label>
      <label>{t("settings.bio", lang)}<textarea value={form.bio} onChange={e => setForm({...form, bio:e.target.value})} maxLength={300} placeholder={t("settings.bioPlaceholder", lang)} /></label>
      <label>{t("settings.website", lang)}<input value={form.website} onChange={e => setForm({...form, website:e.target.value})} placeholder="https://..." /></label>
      <label>{t("settings.level", lang)}
        <select value={form.level} onChange={e => setForm({...form, level:e.target.value})}>
          <option value="">{t("settings.noLevel", lang)}</option>
          {Object.entries(LEVELS).map(([key, item]) => <option key={key} value={key}>{item.emoji} {item.label[lang]}</option>)}
        </select>
      </label>
      <label>{t("settings.thGithub", lang)}<input value={profile?.github_username || ""} disabled /></label>
      <div className="settings-actions"><button className="btn btn-signal" disabled={busy}>{busy ? t("settings.saving", lang) : t("settings.save", lang)}</button><button type="button" className="btn btn-ghost" onClick={logout}>{t("settings.signout", lang)}</button></div>
      {message && <p className="success">{message}</p>}{error && <p className="form-error">{error}</p>}
    </form>
  </div></>;
}