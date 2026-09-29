import type { ReactNode } from 'react';
import { Vazirmatn } from 'next/font/google';
import { AppShell } from '@/ui/shell/AppShell';
import './globals.css';

const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-vazirmatn',
});

// Runs before first paint: no storage access, only the system preference (persistence: M2).
const themeScript = `document.documentElement.classList.toggle('dark',matchMedia('(prefers-color-scheme: dark)').matches)`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // lang/dir are fixed to the default (fa, RTL) until M3 makes them cookie-driven.
    <html lang="fa" dir="rtl" className={vazirmatn.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
