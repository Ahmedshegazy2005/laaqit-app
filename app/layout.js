import "./globals.css";
import { getLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default function RootLayout({ children }) {
  const lang = getLang();
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <body>{children}</body>
    </html>
  );
}

export async function generateMetadata() {
  const lang = getLang();
  return {
    title: t("meta.title", lang),
    description: t("meta.description", lang),
    icons: { icon: "/icon.png" },
  };
}