import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import { Provider } from '@/components/provider';
import { appName, siteUrl } from '@/lib/shared';
import './global.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
});

const description =
  'OpenSpec — это лёгковесный слой согласования между вами и вашим ИИ. Договоритесь о том, что нужно создать, ещё до написания кода. Поддерживает более 30 ИИ-ассистентов для программирования.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${appName} | Сначала договоритесь, затем уверенно создавайте`,
    template: `%s | ${appName}`,
  },
  description,
  openGraph: {
    title: `${appName} | Сначала договоритесь, затем уверенно создавайте`,
    description,
    siteName: appName,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: appName,
    description,
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ru" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
        {/* Cloudflare Web Analytics (openspec_ru): посещаемость, источники, страницы. */}
        <script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "c4c5e4b6ae5a4c28bf237c81c89958ed"}'
        />
      </body>
    </html>
  );
}
