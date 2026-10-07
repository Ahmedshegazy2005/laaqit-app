import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PostComposer from "./PostComposer";

export default async function SocialPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, created_at, profile_id, profiles(id, display_name, github_username, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="wrap" style={{ paddingTop: 28, paddingBottom: 80 }}>
      <div className="social-topbar">
        <Link href="/" className="brand">لاقط</Link>
        <nav>
          <Link href="/social">المجتمع</Link>
          <Link href="/dashboard">التحليل</Link>
          <Link href={`/profile/${user.id}`}>ملفي</Link>
          <Link href="/settings">الإعدادات</Link>
        </nav>
      </div>
      <div className="social-grid">
        <aside className="card social-side">
          <Link href={`/profile/${user.id}`} className="profile-mini">
            <Avatar src={user.user_metadata?.avatar_url} name={user.user_metadata?.user_name || "مستخدم"} size={54} />
            <div><strong>{user.user_metadata?.user_name || "حسابي"}</strong><small>عرض الملف الشخصي</small></div>
          </Link>
          <Link className="side-link" href="/settings">⚙ إعدادات الحساب</Link>
          <Link className="side-link" href="/dashboard">▣ بطاقة المهارات</Link>
        </aside>
        <section>
          <PostComposer />
          <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
            {(posts || []).map((post) => <PostCard key={post.id} post={post} own={post.profile_id === user.id} />)}
            {!posts?.length && <div className="card empty">لسه مفيش منشورات. اكتب أول منشور ليك.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Avatar({ src, name, size = 48 }) {
  return src ? <img className="avatar" src={src} alt="" width={size} height={size} style={{ width: size, height: size }} /> : <div className="avatar avatar-fallback" style={{ width: size, height: size }}>{(name || "؟").slice(0, 1).toUpperCase()}</div>;
}

function PostCard({ post, own }) {
  const p = post.profiles || {};
  return <article className="card post-card">
    <div className="post-head">
      <Avatar src={p.avatar_url} name={p.display_name || p.github_username} />
      <div><Link href={`/profile/${p.id}`}>{p.display_name || p.github_username || "مستخدم"}</Link><small>{new Date(post.created_at).toLocaleString("ar-EG")}</small></div>
      {own && <span className="post-own">منشوري</span>}
    </div>
    <p className="post-content">{post.content}</p>
  </article>;
}
