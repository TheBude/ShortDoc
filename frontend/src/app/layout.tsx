import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { AppLayout } from '@/components/AppLayout';

export const metadata: Metadata = {
  title: 'ShortDoc — Universitet Hujjatlar Aylanishi Tizimi',
  description: 'Universitet ma’muriy hujjat aylanishi va ijro intizomi platformasi',
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
