import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'CareBridge — International care, thoughtfully coordinated',
    short_name: 'CareBridge',
    description: 'Secure, multilingual coordination for international healthcare journeys.',
    start_url: '/en',
    scope: '/',
    display: 'standalone',
    background_color: '#f8fbff',
    theme_color: '#2563eb',
    orientation: 'portrait-primary',
    lang: 'en',
    categories: ['health', 'medical', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
