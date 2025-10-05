import '../styles/justify.css'
import '../styles/justify.css'
import type { Metadata } from 'next';export const metadata: Metadata = {
  metadataBase: new URL('https://sierradoc.site'),
  title: 'SIERRA — Documentary',
  description:
    'Feature documentary filmed in the Elizondo Range (San Juan, Argentina). Director: Juan F. Montes. Trailer, synopsis, gallery and press.',
  keywords: ['Sierra', 'documentary', 'San Juan', 'Elizondo Range', 'INCAA', 'Mulánima'],
  alternates: { canonical: '/en', languages: { es: '/', en: '/en' } },
  openGraph: {
    type: 'website',
    url: 'https://sierradoc.site/en',
    siteName: 'SIERRA',
    title: 'SIERRA — Documentary',
    description: 'Feature documentary from San Juan, Argentina.',
    images: [{ url: 'https://sierradoc.site/assets/og/facebook_opengraph.jpg', width: 1200, height: 630, alt: 'SIERRA' }],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SIERRA — Documentary',
    description: 'Feature documentary from San Juan, Argentina.',
    images: ['https://sierradoc.site/assets/og/twitter_card.jpg'],
  },
  robots: { index: true, follow: true },
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}