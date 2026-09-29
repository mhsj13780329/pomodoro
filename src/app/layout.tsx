import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { Vazirmatn } from 'next/font/google';
import { SettingsProvider } from '@/application/providers/SettingsProvider';
import { AppShell } from '@/ui/shell/AppShell';
import './globals.css';

const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-vazirmatn',
});

// Only for first-time visitors or the `system` choice: an explicit choice is already
// rendered by the server from the theme cookie (mirrored by SettingsProvider).
const themeScript = `document.documentElement.classList.toggle('dark',matchMedia('(prefers-color-scheme: dark)').matches)`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = (await cookies()).get('pomodoro-theme')?.value;
  const explicit = theme === 'dark' || theme === 'light';
  const className = [vazirmatn.variable, theme === 'dark' ? 'dark' : ''].filter(Boolean).join(' ');
  return (
    // lang/dir are fixed to the default (fa, RTL) until M3 makes them cookie-driven.
    <html lang="fa" dir="rtl" className={className} suppressHydrationWarning>
      <head>
        {explicit ? null : <script dangerouslySetInnerHTML={{ __html: themeScript }} />}
      </head>
      <body>
        <SettingsProvider>
          <AppShell>{children}</AppShell>
        </SettingsProvider>
      </body>
    </html>
  );
}
