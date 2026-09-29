import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { Vazirmatn } from 'next/font/google';
import { LocaleProvider } from '@/application/providers/LocaleProvider';
import { SettingsProvider } from '@/application/providers/SettingsProvider';
import { ToastProvider } from '@/application/providers/ToastProvider';
import { TimerProvider } from '@/application/timer/TimerProvider';
import { LOCALE_COOKIE, dirOf, parseLocale } from '@/i18n';
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
  const jar = await cookies();
  const theme = jar.get('pomodoro-theme')?.value;
  const locale = parseLocale(jar.get(LOCALE_COOKIE)?.value);
  const explicit = theme === 'dark' || theme === 'light';
  const className = [vazirmatn.variable, theme === 'dark' ? 'dark' : ''].filter(Boolean).join(' ');
  return (
    <html lang={locale} dir={dirOf(locale)} className={className} suppressHydrationWarning>
      <head>
        {explicit ? null : <script dangerouslySetInnerHTML={{ __html: themeScript }} />}
      </head>
      <body>
        <SettingsProvider>
          <LocaleProvider initialLocale={locale}>
            <ToastProvider>
              <TimerProvider>
                <AppShell>{children}</AppShell>
              </TimerProvider>
            </ToastProvider>
          </LocaleProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
