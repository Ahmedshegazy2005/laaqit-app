import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LEVELS, levelLabel } from "@/lib/levels";
import { getLang } from "@/lib/i18n-server";
import { t, localeFor } from "@/lib/i18n";
import SiteBrand from "@/components/SiteBrand";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default async function ProfilePage({ params }) {
  const lang = getLang();
  const supabase = createClient();
  const { data: profile } = await supabase.from("profiles").select("id, github_username, display_name, bio, website, avatar_url, level, created_at").eq("id", params.id).single();
  if (!profile) notFound();
  const { data: posts } = await supabase.from("posts").select("id, content, created_at").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(30);
  const { data: report } = await supabase.from("skill_reports").select("summary, analyzed_at").eq("profile_id", profile.id).order("analyzed_at", { ascending: false }).limit(1).maybeSingle();
  const name = profile.display_name || profile.github_username || t("profile.defaultName", lang);
  return <main className="wrap" style={{ paddingTop: 28, paddingBottom: 80, maxWidth: 850 }}>
    <div className="social-topbar">
      <div className="topbar-row"><SiteBrand lang={lang} /><LanguageSwitcher lang={lang} /></div>
      <nav><Link href="/social">{t("nav.community", lang)}</Link><Link href="/dashboard">{t("nav.analysis", lang)}</Link><Link href="/settings">{t("nav.settings", lang)}</Link></nav>
    </div>
    <section className="card public-profile"><div className="public-head"><img className="avatar" src={profile.avatar_url || ""} alt="" width="104" height="104" style={{width:104,height:104}} /><div><div className="profile-title-row"><h1>{name}</h1>{profile.level && <span className={`level-badge ${profile.level}`}>{LEVELS[profile.level]?.emoji} {levelLabel(profile.level, lang)}</span>}</div><div className="mono handle">@{profile.github_username || "laaqit-user"}</div>{profile.bio && <p>{profile.bio}</p>}{profile.website && <a href={profile.website} target="_blank" rel="noreferrer">{t("profile.website", lang)}</a>}</div></div></section>
    {report?.summary?.scores && <section className="card" style={{marginTop:18}}><h2>{t("profile.skillsCard", lang)}</h2>{Object.entries(report.summary.scores).map(([k,v]) => <div className="skill-row" key={k}><span>{t(`skill.${k}`, lang)}</span><div className="bar-track"><div className="bar-fill" style={{width:`${v}%`}}/></div><b>{v}</b></div>)}</section>}
    <section style={{marginTop:18}}><h2 style={{marginBottom:12}}>{t("profile.posts", lang, { name })}</h2>{posts?.map(post => <article className="card post-card" key={post.id}><div className="mono post-date">{new Date(post.created_at).toLocaleString(localeFor(lang))}</div><p className="post-content">{post.content}</p></article>)}{!posts?.length && <div className="card empty">{t("profile.noPosts", lang)}</div>}</section>
  </main>;
}