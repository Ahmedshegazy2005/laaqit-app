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
      <div className="wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 19, textDecoration: "none", color: "var(--ink)" }}>
          <svg width="26" height="26" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
            <rect width="100" height="100" rx="22" fill="#12112A" />
            <circle cx="30" cy="72" r="5" fill="#2E2B5E" />
            <circle cx="50" cy="78" r="5" fill="#2E2B5E" />
            <circle cx="70" cy="72" r="5" fill="#2E2B5E" />
            <circle cx="40" cy="60" r="4" fill="#2E2B5E" />
            <circle cx="60" cy="60" r="4" fill="#2E2B5E" />
            <circle cx="50" cy="30" r="17" fill="#F2B84B" opacity="0.18" />
            <circle cx="50" cy="30" r="11" fill="#F2B84B" />
          </svg>
          Laaqit
        </Link>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/try" className="btn btn-ghost">Try without signup</Link>
          <Link href="/discover" className="btn btn-ghost">Discover developers</Link>
          {!loading && user && (
            <Link href="/dashboard" className="btn btn-ghost">Dashboard</Link>
          )}
          {!loading && !user && (
            <Link href="/login" className="btn btn-signal">Sign in</Link>
          )}
          {!loading && user && (
            <button onClick={handleSignOut} className="btn btn-ghost">Sign out</button>
          )}
        </div>
      </div>
    </header>
  );
}
