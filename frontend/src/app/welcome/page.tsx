import { Metadata } from 'next';
import { WelcomeLanding } from '@/components/WelcomeLanding';

export const metadata: Metadata = {
  title: 'SamDU ShortDoc — Sharof Rashidov nomidagi Samarqand Davlat Universiteti',
  description: 'Sharof Rashidov nomidagi Samarqand davlat universiteti (SamDU) elektron hujjat aylanishi va ijro intizomi platformasi',
  icons: {
    icon: '/samdu-logo.png',
  },
};

export default function WelcomePage() {
  return <WelcomeLanding />;
}
