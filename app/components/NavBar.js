"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NavBar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user || null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header style={{ borderBottom: "1px solid var(--line)", padding: "16px 0" }}>
      <div className="wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: 19, textDecoration: "none", color: "var(--ink)" }}>
          لاقط
        </Link>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/discover" className="btn btn-ghost">اكتشف مطورين</Link>
          {!loading && user && (
            <Link href="/dashboard" className="btn btn-ghost">لوحتي</Link>
          )}
          {!loading && !user && (
            <Link href="/login" className="btn btn-signal">سجّل دخول</Link>
          )}
          {!loading && user && (
            <button onClick={handleSignOut} className="btn btn-ghost">تسجيل خروج</button>
          )}
        </div>
      </div>
    </header>
  );
}
