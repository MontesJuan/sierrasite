'use client';

type Props = {
  images: string[];
  ariaLabel?: string;
};

export default function Slider({ images, ariaLabel = 'galería' }: Props) {
  return (
    <div className="wrap" aria-label={ariaLabel}>
      <div className="rail">
        {images.map((src, i) => (
          <div className="item" key={i}>
            <img loading="lazy" src={src} alt={`imagen ${i + 1}`} />
          </div>
        ))}
      </div>

      <style jsx>{`
        .wrap {
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          background: #111;
          max-width: 1100px;
          margin: 0 auto;
        }
        .rail {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          padding: 8px;
        }
        .rail::-webkit-scrollbar {
          height: 8px;
        }
        .rail::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 8px;
        }

        /* Tamaño moderado y consistente */
        .item {
          flex: 0 0 auto;
          scroll-snap-align: start;
          border-radius: 10px;
          overflow: hidden;
          background: #000;

          /* ancho/alto responsivo, evitando que se haga gigante */
          width: clamp(220px, 60vw, 520px);
          height: clamp(180px, 45vh, 380px);
        }

        /* La imagen entra completa (sin recortes) */
        img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain; /* ← clave para que entre completa */
          background: #000;
        }

        @media (min-width: 1024px) {
          .rail {
            gap: 10px;
            padding: 10px;
          }
          .item {
            width: clamp(260px, 42vw, 520px);
            height: clamp(200px, 42vh, 360px);
          }
        }
      `}</style>
    </div>
  );
}