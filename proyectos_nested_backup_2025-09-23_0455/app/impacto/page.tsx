'use client';

export default function Page() {
  return (
    <main className="wrap">
      <section className="section">
        <div className="card dark">
          <h2>Impacto social</h2>

          <p>
            «SIERRA» trasciende lo cinematográfico para convertirse en una herramienta
            de memoria, educación y cambio social.
          </p>

          <ul>
            <li><strong>Preservación cultural:</strong> difunde y resguarda las tradiciones serranas frente a los cambios del mundo moderno.</li>
            <li><strong>Educación:</strong> plataforma pedagógica y de sensibilización sobre la vida rural argentina.</li>
            <li><strong>Visibilización:</strong> expone problemáticas como el aislamiento y el acceso limitado a servicios básicos.</li>
            <li><strong>Empatía:</strong> acerca al público a realidades poco conocidas, tendiendo puentes culturales.</li>
            <li><strong>Turismo sostenible:</strong> puede impulsar la economía local con impacto positivo en la comunidad.</li>
            <li><strong>Legado:</strong> memoria para futuras generaciones y referencia cultural.</li>
          </ul>

          <p>
            En síntesis, <strong>Sierra</strong> no es solo un documental: es un agente de
            preservación cultural y social, y una ventana a un universo que resiste en las
            montañas de San Juan.
          </p>
        </div>

        <div className="card light">
          <img
            src="/assets/ilustraciones/chivo.png"
            alt="Ilustración chivo"
            className="img"
          />
        </div>
      </section>

      <style jsx>{`
        .wrap {
          padding: 24px;
        }
        .section {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          gap: 24px;
          align-items: start;
        }
        @media (min-width: 900px) {
          .section {
            grid-template-columns: 1fr 1fr;
          }
        }
        .card {
          border-radius: 12px;
          padding: 24px;
        }
        .dark {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
        }
        .light {
          background: #ffffff;
          color: #111;
        }
        h2 {
          margin: 0 0 12px;
          font-size: 28px;
          line-height: 1.2;
        }
        p, li {
          text-align: justify;
          text-justify: inter-word;
          line-height: 1.6;
        }
        p { margin: 0 0 14px; }
        ul { margin: 0 0 14px 1rem; padding: 0; }
        .img {
          width: 100%;
          height: auto;
          display: block;
        }
      `}</style>
    </main>
  );
}