# لاقط — Laaqit

منصة اكتشاف مواهب برمجية بالذكاء الاصطناعي. Next.js + Supabase + Gemini.

## قبل النشر، لازم تشغّل السكيما

روح لـ Supabase SQL Editor وشغّل محتوى ملف `supabase/schema.sql` مرة واحدة.

## متغيرات البيئة المطلوبة على Vercel

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` (سري)
- `GEMINI_API_KEY` (سري)

## البنية

- `/app/page.js` — الصفحة الرئيسية
- `/app/login` — تسجيل دخول عبر GitHub (Supabase Auth)
- `/app/auth/callback` — استقبال رجوع GitHub OAuth
- `/app/dashboard` — لوحة المطور + زرار التحليل
- `/app/api/analyze` — يجيب مشاريع GitHub العامة ويحللها بـ Gemini
- `/app/discover` — دليل عام للمطورين المحلَّلين (للشركات)
- `/supabase/schema.sql` — جداول قاعدة البيانات
