import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { getLocaleDirection, isLocale } from '@/src/i18n/config';
import { getApplicationUrl } from '@/src/lib/env/public';
import { ServiceWorkerRegistrar } from '@/src/features/pwa/service-worker-registrar';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import './globals.css';

const applicationUrl = getApplicationUrl();

export const metadata: Metadata = {
  metadataBase: applicationUrl,
  title: {
    default: 'CareBridge | International care, thoughtfully coordinated',
    template: '%s | CareBridge',
  },
  description: 'A secure, multilingual platform for exploring international healthcare and coordinating the patient journey.',
  applicationName: 'CareBridge',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'CareBridge' },
  openGraph: {
    type: 'website',
    title: 'CareBridge',
    description: 'International care, thoughtfully coordinated',
    url: applicationUrl,
    images: [{ url: new URL('/og.png', applicationUrl), width: 1200, height: 630, alt: 'CareBridge — International care, thoughtfully coordinated' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CareBridge',
    description: 'International care, thoughtfully coordinated',
    images: [new URL('/og.png', applicationUrl)],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#164b7a',
  colorScheme: 'light',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const localeHeader = requestHeaders.get('x-carebridge-locale') ?? 'en';
  const locale = isLocale(localeHeader) ? localeHeader : 'en';

  return (
    <html dir={getLocaleDirection(locale)} lang={locale} suppressHydrationWarning>
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
