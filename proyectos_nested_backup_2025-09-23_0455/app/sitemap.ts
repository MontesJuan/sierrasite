import type { MetadataRoute } from 'next';

const host = 'https://sierradoc.site';

export default function sitemap(): MetadataRoute.Sitemap {
  const es = [
    '/', '/sinopsis', '/trailer', '/impacto', '/equipo', '/financiacion',
    '/distribucion', '/estado-actual', '/galeria', '/contacto', '/prensa',
  ];
  const en = [
    '/en', '/en/synopsis', '/en/trailer', '/en/social-impact', '/en/team',
    '/en/collaborate', '/en/distribution', '/en/current-status',
    '/en/gallery', '/en/contact', '/en/press',
  ];
  const now = new Date();

  return [...es, ...en].map((p) => ({
    url: `${host}${p}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: p === '/' || p === '/en' ? 1 : 0.7,
  }));
}