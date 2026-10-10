import { cookies } from "next/headers";

// بيقرا اللغة من الكوكيز على السيرفر — 'ar' الافتراضية
export function getLang() {
  const store = cookies();
  const v = store.get("lang")?.value;
  return v === "en" ? "en" : "ar";
}