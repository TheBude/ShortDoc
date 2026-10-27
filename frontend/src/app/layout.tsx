import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { RealtimeProvider } from '@/context/RealtimeContext';
import { AppLayout } from '@/components/AppLayout';

export const metadata: Metadata = {
  title: 'SamDU ShortDoc — Sharof Rashidov nomidagi Samarqand Davlat Universiteti',
  description: 'Sharof Rashidov nomidagi Samarqand davlat universiteti elektron hujjat aylanishi va ijro intizomi platformasi',
  icons: {
    icon: '/samdu-logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Android'da klaviatura ochilganda sahifa o‘lchami moslashadi (oynadagi tugmalar klaviatura ostida qolmaydi)
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="antialiased text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <RealtimeProvider>
                <SidebarProvider>
                  <AppLayout>{children}</AppLayout>
                </SidebarProvider>
              </RealtimeProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
