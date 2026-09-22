import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <header style={{ borderBottom: "1px solid var(--line)", padding: "16px 0" }}>
        <div className="wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 19 }}>لاقط</div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/discover" className="btn btn-ghost">اكتشف مطورين</Link>
            <Link href="/login" className="btn btn-signal">سجّل دخول</Link>
          </div>
        </div>
      </header>

      <section className="wrap" style={{ padding: "80px 0 60px", maxWidth: 720 }}>
        <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "clamp(32px,5vw,50px)", lineHeight: 1.2, marginBottom: 22 }}>
          فيه إشارة وسط الضوضاء. إحنا بنلقطها.
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 18, lineHeight: 1.75, marginBottom: 32 }}>
          لاقط بيحلل مشاريع وكود المطورين الشباب فعليًا — مش بس السيرة الذاتية — ويوصّل المواهب الحقيقية للشركات اللي بتدور عليها.
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Link href="/login" className="btn btn-signal">سجّل كمطوّر</Link>
          <Link href="/discover" className="btn btn-ghost">استكشف كشركة</Link>
        </div>
      </section>
    </main>
  );
}
