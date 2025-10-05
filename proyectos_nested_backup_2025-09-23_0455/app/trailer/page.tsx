import type { Metadata } from 'next';

const SITE = 'https://sierradoc.site';
const POSTER = `${SITE}/assets/og/facebook_opengraph.jpg`;
const MAIN_ID = '69gDyIS-qMI';
const ALT_ID  = 'D9eAYHrvDjc';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: 'Tráiler — SIERRA',
  description:
    'Mirá el tráiler oficial de SIERRA: documental rodado en las Sierras de Elizondo (San Juan, Argentina).',
  alternates: { canonical: '/trailer', languages: { en: '/en/trailer' } },
  openGraph: {
    type: 'video.other',
    url: `${SITE}/trailer`,
    siteName: 'SIERRA',
    title: 'Tráiler — SIERRA',
    description:
      'Mirá el tráiler oficial de SIERRA: documental rodado en las Sierras de Elizondo (San Juan, Argentina).',
    images: [{ url: POSTER, width: 1200, height: 630, alt: 'SIERRA — póster' }],
    videos: [{ url: `https://www.youtube.com/embed/${MAIN_ID}`, width: 1280, height: 720 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@sierra.docu',
    title: 'Tráiler — SIERRA',
    description:
      'Mirá el tráiler oficial de SIERRA: documental rodado en las Sierras de Elizondo (San Juan, Argentina).',
    images: [POSTER],
  },
  robots: { index: true, follow: true },
};

function Video({ id, title }: { id: string; title: string }) {
  return (
    <div
      role="region"
      aria-label={title}
      style={{
        width: '100%',
        maxWidth: 960,
        margin: '0 auto',
        aspectRatio: '16 / 9',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 0 0 1px rgba(255,255,255,.08) inset',
        background: '#000',
      }}
    >
      <iframe
        loading="lazy"
        src={`https://www.youtube.com/embed/${id}?rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        style={{ width: '100%', height: '100%', display: 'block', border: 0 }}
      />
    </div>
  );
}

export default function Page() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: 'SIERRA — Tráiler oficial',
    inLanguage: 'es',
    description:
      'Tráiler oficial de SIERRA, largometraje documental filmado en las Sierras de Elizondo, San Juan (Argentina).',
    thumbnailUrl: [POSTER],
    uploadDate: '2025-09-16',
    embedUrl: `https://www.youtube.com/embed/${MAIN_ID}`,
    publisher: { '@type': 'Organization', name: 'Mulánima' },
    potentialAction: { '@type': 'WatchAction', target: [`${SITE}/trailer`] },
    isFamilyFriendly: true,
  };

  return (
    <main
      style={{
        padding: '32px 20px 60px',
        maxWidth: 1120,
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: '1.75rem', margin: '0 0 16px' }}>Tráiler</h1>

      <Video id={MAIN_ID} title="SIERRA — Tráiler oficial" />

      <div style={{ height: 24 }} />

      <h2 style={{ fontSize: '1.1rem', margin: '28px 0 12px', opacity: 0.85 }}>
        Tráiler alternativo
      </h2>
      <Video id={ALT_ID} title="SIERRA — Tráiler alternativo" />

      <script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
/>
    </main>
  );
}