import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import LevelPicker from "./LevelPicker";
import SiteBrand from "@/components/SiteBrand";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export async function generateMetadata() {
  const lang = getLang();
  return { title: t("onboarding.metaTitle", lang) };
}

export default async function OnboardingPage() {
  const lang = getLang();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("level")
    .eq("id", user.id)
    .single();

  // لو مختار مستواه قبل كده مفيش داعي يكررها
  if (profile?.level) redirect("/social");

  const name = user.user_metadata?.user_name || (lang === "ar" ? "حضرتك" : "there");

  return (
    <main className="wrap" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="social-topbar">
        <div className="topbar-row"><SiteBrand lang={lang} /><LanguageSwitcher lang={lang} /></div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: 40 }}>
        <section className="card onboarding-card">
          <div className="mono" style={{ color: "var(--signal)", fontSize: 12 }}>
            {t("onboarding.step", lang)}
          </div>
          <h1>{t("onboarding.title", lang, { name })}</h1>
          <p>{t("onboarding.sub", lang)}</p>
          <LevelPicker lang={lang} />
        </section>
      </div>
    </main>
  );
}