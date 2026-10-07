import "./globals.css";


export const metadata = {
  title: "Laaqit — AI-Powered Developer Skill Analysis",
  description: "Laaqit analyzes developers' real code with AI and connects them with companies looking for talent.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        {children}
       
      </body>
    </html>
  );
}
