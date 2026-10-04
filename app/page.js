import Link from "next/link";
import NavBar from "./components/NavBar";

export default function HomePage() {
  return (
    <main>
      <NavBar />

      <section className="wrap" style={{ padding: "80px 0 60px", maxWidth: 720 }}>
        <div className="mono" style={{ color: "var(--signal)", fontSize: 13, marginBottom: 18 }}>
          Completely free · no credit card
        </div>
        <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "clamp(32px,5vw,50px)", lineHeight: 1.2, marginBottom: 22 }}>
          What's your real coding level?
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 18, lineHeight: 1.75, marginBottom: 32 }}>
          Connect your GitHub and let AI analyze your actual projects — code quality, project structure, and areas to improve — then get a real skill card you can share with anyone.
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Link href="/try" className="btn btn-signal">Try it free, no signup</Link>
          <Link href="/login" className="btn btn-ghost">Sign in with GitHub</Link>
        </div>
      </section>
    </main>
  );
}
