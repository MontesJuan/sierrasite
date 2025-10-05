'use client';

export default function Page() {
  return (
    <main className="wrap">
      <section className="section">
        <div className="card dark">
          <h2>Equipo técnico</h2>
          <ul>
            <li><strong>GUION Y DIRECCIÓN:</strong> Juan Francisco Montes</li>
            <li><strong>PRODUCCIÓN:</strong> Ciro Nestor Novelli</li>
            <li><strong>Jefe de Producción:</strong> Bruno Sesto (Mza)</li>
            <li><strong>Dirección de Fotografía 1er rodaje:</strong> Nicolás Farina (BsAs)</li>
            <li><strong>Dirección de Fotografía 2do rodaje:</strong> Juan F. Montes (SJ)</li>
            <li><strong>Cámara:</strong> Bruno Sesto (Mza)</li>
            <li><strong>Sonido primer rodaje:</strong> Javier Ruiz (Mza)</li>
            <li><strong>Sonido segundo rodaje:</strong> Bernardo Blanco (Mza)</li>
            <li><strong>Diseño de Sonido:</strong> Alejandro Zogbe (Jujuy)</li>
            <li><strong>Música:</strong> Juan F. Montes</li>
            <li><strong>Edición y postproducción:</strong> Juan F. Montes, Andrés Jones (SJ)</li>
            <li><strong>Antropólogo:</strong> Diego Garcés (SJ)</li>
            <li><strong>Asistente de Producción:</strong> Nicolás Nuñez (Mza)</li>
            <li><strong>Diseño gráfico:</strong> Hermanos Kutter (SJ)</li>
          </ul>
        </div>

        <div className="card light">
          <img
            src="/assets/ilustraciones/reyesescribe.png"
            alt="Ilustración de Reyes escribiendo"
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
        li { margin: 0 0 8px; }
        ul { margin: 0; padding-left: 1rem; }
        .img {
          width: 100%;
          height: auto;
          display: block;
        }
      `}</style>
    </main>
  );
}