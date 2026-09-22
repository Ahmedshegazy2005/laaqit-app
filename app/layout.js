import "./globals.css";

export const metadata = {
  title: "لاقط — منصة اكتشاف مواهب برمجية",
  description: "لاقط بيحلل كود المطورين الشباب فعليًا ويوصّلهم بالشركات اللي بتدور عليهم.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
