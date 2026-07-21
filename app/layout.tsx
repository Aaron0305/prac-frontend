import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import "./globals.css";

// const inter = Inter({
//   subsets: ["latin"],
//   display: "swap",
// });

export const metadata: Metadata = {
  title: "RedAI",
  description: "Plataforma de consulta sobre Inteligencia Artificial: Un Enfoque Moderno",
  icons: {
    icon: "/openclaw.svg",
    shortcut: "/openclaw.svg",
    apple: "/openclaw.svg",
  },
};

// Script para detectar tema antes del renderizado 
const themeScript = `
  (function() {
    try {
      var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      if (isDark) {
        document.documentElement.style.colorScheme = 'dark';
        document.documentElement.style.backgroundColor = '#0c1929';
      } else {
        document.documentElement.style.colorScheme = 'light';
        document.documentElement.style.backgroundColor = '#f8fafc';
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {/* <body className={inter.className}> */}
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
