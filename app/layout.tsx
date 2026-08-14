import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Providers from './providers';
import '../src/tailwind.css';

export const metadata: Metadata = {
  title: 'XIV MitPlan',
  description: 'Collaborative Final Fantasy XIV mitigation planning.',
  icons: { icon: '/xivmitplan.ico' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
