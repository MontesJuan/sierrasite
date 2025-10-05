import fs from 'fs';
import path from 'path';
import Slider from '../components/Slider';

type GalleryData = {
  backstage: string[];
  stills: string[];
};

export const dynamic = 'force-static';

async function getData(): Promise<GalleryData> {
  const p = path.join(process.cwd(), 'app', 'data', 'gallery.json');
  const raw = await fs.promises.readFile(p, 'utf8');
  return JSON.parse(raw) as GalleryData;
}

export default async function Page() {
  const data = await getData();

  return (
    <main className="section container" style={{ paddingTop: 8 }}>
      <section style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 8px 0', lineHeight: 1.2, fontSize: 20 }}>
          BACKSTAGE
        </h2>
        <Slider images={data.backstage} ariaLabel="galería backstage" />
      </section>

      <section style={{ maxWidth: 1200, margin: '12px auto 0' }}>
        <h2 style={{ margin: '0 0 8px 0', lineHeight: 1.2, fontSize: 20 }}>
          STILLS
        </h2>
        <Slider images={data.stills} ariaLabel="galería stills" />
      </section>
    </main>
  );
}