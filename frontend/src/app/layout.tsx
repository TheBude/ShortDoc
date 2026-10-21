import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppLayout } from '@/components/AppLayout';

export const metadata: Metadata = {
  title: 'SamDU ShortDoc — Sharof Rashidov nomidagi Samarqand Davlat Universiteti',
  description: 'Sharof Rashidov nomidagi Samarqand davlat universiteti elektron hujjat aylanishi va ijro intizomi platformasi',
  icons: {
    icon: '/samdu-logo.png',
  },
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
          <AuthProvider>
            <AppLayout>{children}</AppLayout>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
