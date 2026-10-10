import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLang } from "@/lib/i18n-server";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const lang = getLang();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return <main className="wrap" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 760 }}><SettingsForm user={user} profile={profile} lang={lang} /></main>;
}