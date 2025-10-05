'use client';

export default function Page() {
  return (
    <main className="wrap">
      <section className="section">
        <div className="card dark">
          <h2>Sinopsis</h2>

          <p>
            Sierra es un viaje profundo al corazón de la montaña, donde el tiempo
            se mide en horas de mula, en distancias infinitas y en la memoria de
            sus habitantes. En este microcosmos forjado por el aislamiento y la
            naturaleza, cada oficio, cada gesto y cada silencio se convierten en
            forma de resistencia y pertenencia.
          </p>

          <p>
            En Vallecito, el rincón más remoto de las Sierras de Elizondo, vive
            Ladislao Reyes Chávez, puestero y poeta popular que ha dedicado su vida
            a escribir más de ochocientos poemas en cuadernos que guarda como su
            mayor tesoro. Tras publicar su primer libro, <em>Trovador Vallisto</em>,
            en 2018, Reyes sueña con editar una segunda obra que preserve la voz y
            la memoria de su gente. Ese anhelo encuentra un aliado inesperado en
            los alumnos y maestras de la escuela albergue, quienes lo ayudan a
            digitalizar sus manuscritos, tejiendo un puente entre la tradición y
            el futuro.
          </p>

          <p>
            En paralelo, la sierra enfrenta la irrupción del Camino de los Sueños,
            inaugurado en 2022. Una obra que prometió integración y desarrollo,
            pero que también abrió nuevas tensiones en la comunidad: ¿qué se gana
            y qué se pierde cuando el “progreso” llega hasta un territorio donde
            la vida se sostuvo durante siglos con reglas propias?
          </p>

          <p>
            Con imágenes majestuosas y la cadencia de la palabra poética, Sierra
            retrata la crudeza y la belleza de un mundo en transformación, y
            plantea preguntas que resuenan más allá de las montañas: ¿Podrá Reyes
            cumplir el sueño de ver sus poemas publicados? ¿Será el camino un
            puente hacia el futuro o una amenaza para la identidad de los
            serranos?
          </p>
        </div>

        <div className="card light">
          <img
            src="/assets/press/reyes.png"
            alt="Ilustración de Ladislao Reyes"
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
        p {
          text-align: justify;
          text-justify: inter-word;
          margin: 0 0 14px;
          line-height: 1.6;
        }
        .img {
          width: 100%;
          height: auto;
          display: block;
        }
      `}</style>
    </main>
  );
}