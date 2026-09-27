import Link from "next/link";
import NavBar from "./components/NavBar";

export default function HomePage() {
  return (
    <main>
      <NavBar />

      <section className="wrap" style={{ padding: "80px 0 60px", maxWidth: 720 }}>
        <div className="mono" style={{ color: "var(--signal)", fontSize: 13, marginBottom: 18 }}>
          مجاني تمامًا · بدون بطاقة ائتمان
        </div>
        <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "clamp(32px,5vw,50px)", lineHeight: 1.2, marginBottom: 22 }}>
          إيه مستواك البرمجي الحقيقي؟
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 18, lineHeight: 1.75, marginBottom: 32 }}>
          اربط GitHub بتاعك، وهنحلل مشاريعك الفعلية بالذكاء الاصطناعي — جودة الكود، بنية المشروع، ونقاط التطوير — ونطلعلك بطاقة مهارات حقيقية تقدر تشاركها مع أي حد.
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Link href="/try" className="btn btn-signal">جرّب دلوقتي من غير تسجيل</Link>
          <Link href="/login" className="btn btn-ghost">سجّل بحساب GitHub</Link>
        </div>
      </section>
    </main>
  );
}
