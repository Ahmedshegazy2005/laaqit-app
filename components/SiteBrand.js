import Link from "next/link";
import { t } from "@/lib/i18n";

// اللوجو + اسم الموقع — بيتكرر في كل الهيدرات
export default function SiteBrand({ lang = "ar", href = "/", size = 26 }) {
  return (
    <Link href={href} className="brand brand-logo" aria-label={t("brand.name", lang)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="" width={size} height={size} style={{ borderRadius: 8 }} />
      <span>{t("brand.name", lang)}</span>
    </Link>
  );
}