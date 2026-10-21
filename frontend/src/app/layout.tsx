import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
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
    <html lang="uz">
      <body className="antialiased text-slate-800 bg-slate-50">
        <AuthProvider>
          <AppLayout>{children}</AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
