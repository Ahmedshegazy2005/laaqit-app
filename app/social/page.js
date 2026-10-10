import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LEVELS, levelLabel } from "@/lib/levels";
import { getLang } from "@/lib/i18n-server";
import { t, localeFor } from "@/lib/i18n";
import PostComposer from "./PostComposer";
import SiteBrand from "@/components/SiteBrand";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default async function SocialPage() {
  const lang = getLang();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("level, display_name, github_username, avatar_url")
    .eq("id", user.id)
    .single();

  // لسه ما اختارش مستواه؟ ودّيه يختاره الأول
  if (!me?.level) redirect("/onboarding");

  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, created_at, profile_id, profiles(id, display_name, github_username, avatar_url, level)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="wrap" style={{ paddingTop: 28, paddingBottom: 80 }}>
      <div className="social-topbar">
        <div className="topbar-row"><SiteBrand lang={lang} /><LanguageSwitcher lang={lang} /></div>
        <nav>
          <Link href="/social">{t("nav.community", lang)}</Link>
          <Link href="/dashboard">{t("nav.analysis", lang)}</Link>
          <Link href={`/profile/${user.id}`}>{t("nav.myProfile", lang)}</Link>
          <Link href="/settings">{t("nav.settings", lang)}</Link>
        </nav>
      </div>
      <div className="social-grid">
        <aside className="card social-side">
          <Link href={`/profile/${user.id}`} className="profile-mini">
            <Avatar src={me?.avatar_url || user.user_metadata?.avatar_url} name={me?.display_name || me?.github_username || user.user_metadata?.user_name || t("user.defaultName", lang)} size={54} />
            <div>
              <strong>{me?.display_name || me?.github_username || user.user_metadata?.user_name || t("social.myAccount", lang)}</strong>
              <small>{t("social.viewProfile", lang)}</small>
              {me?.level && <span className={`level-badge ${me.level}`}>{LEVELS[me.level]?.emoji} {levelLabel(me.level, lang)}</span>}
            </div>
          </Link>
          <Link className="side-link" href="/settings">{t("social.accountSettings", lang)}</Link>
          <Link className="side-link" href="/dashboard">{t("social.skillsCard", lang)}</Link>
        </aside>
        <section>
          <PostComposer lang={lang} />
          <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
            {(posts || []).map((post) => <PostCard key={post.id} post={post} own={post.profile_id === user.id} lang={lang} />)}
            {!posts?.length && <div className="card empty">{t("social.noPosts", lang)}</div>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Avatar({ src, name, size = 48 }) {
  return src ? <img className="avatar" src={src} alt="" width={size} height={size} style={{ width: size, height: size }} /> : <div className="avatar avatar-fallback" style={{ width: size, height: size }}>{(name || "؟").slice(0, 1).toUpperCase()}</div>;
}

function PostCard({ post, own, lang = "ar" }) {
  const p = post.profiles || {};
  return <article className="card post-card">
    <div className="post-head">
      <Avatar src={p.avatar_url} name={p.display_name || p.github_username} />
      <div>
        <div className="post-head-name">
          <Link href={`/profile/${p.id}`}>{p.display_name || p.github_username || t("user.defaultName", lang)}</Link>
          {p.level && <span className={`level-badge ${p.level}`}>{LEVELS[p.level]?.emoji} {levelLabel(p.level, lang)}</span>}
        </div>
        <small>{new Date(post.created_at).toLocaleString(localeFor(lang))}</small>
      </div>
      {own && <span className="post-own">{t("social.ownPost", lang)}</span>}
    </div>
    <p className="post-content">{post.content}</p>
  </article>;
}