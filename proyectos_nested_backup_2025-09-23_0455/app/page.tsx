import theme from './data/theme.json'
import Image from 'next/image'

export default function Page() {
  const storyline = `"Sierra" es un viaje profundo al corazón de la montaña, donde sus habitantes se amalgaman con la naturaleza en un microcosmos con reglas propias, forjadas por el aislamiento y el paso del tiempo.
En Vallecito, el rincón más remoto de las Sierras de Elizondo, Ladislao Reyes Chávez —puestero y poeta popular— atesora más de ochocientos poemas manuscritos, con la esperanza de convertirlos en un libro. Con la ayuda de los alumnos de la escuela albergue, que digitalizan sus cuadernos, la vida serrana se despliega en toda su crudeza y belleza: viajes interminables a lomo de mula, oficios heredados, un vínculo profundo con la naturaleza y la resistencia de tradiciones en riesgo de desaparecer.
¿Podrá Reyes cumplir el sueño de editar su libro? ¿La llegada del Camino de los Sueños traerá verdadero progreso o transformará para siempre la identidad de los serranos?`

  return (
    <main>
      <div className="hero hero-image" style={{backgroundImage:`url(${theme.brand.posterPath})`}}>
        <div className="shade" style={{opacity: (theme.hero as any)?.overlayOpacity ?? 0.55}} />
        <div className="content container">
          <Image
            src={theme.brand.logoPath}
            width={640}
            height={200}
            alt="SIERRA"
            priority
            sizes="(max-width: 768px) 80vw, 640px"
            style={{ width: 'min(80vw, 640px)', height: 'auto' }}
          />
          <div style={{marginTop:28, display:'flex', justifyContent:'center'}}>
            <Image
              src={(theme.brand as any).producerLogo}
              width={132}
              height={52}
              alt="Mulánima"
              sizes="(max-width: 768px) 40vw, 132px"
              style={{ width: 'auto', height: 'auto', maxWidth: '40vw' }}
            />
          </div>
          <div style={{marginTop:24}}>
            <a className="button" href="/trailer">Ver tráiler</a>{' '}
            <a className="button" href="/financiacion">Patrocinar</a>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <h2>Story Line:</h2>
          <p style={{whiteSpace:'pre-wrap'}}>{storyline}</p>
        </div>
      </section>
    </main>
  )
}
