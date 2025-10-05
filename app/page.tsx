
import data from './data/siteData.json'
import theme from './data/theme.json'
import Image from 'next/image'

export default function Page() {
  return (
    <main>
      <div className="hero hero-image" style={{backgroundImage:`url(${theme.brand.posterPath})`}}>
        <div className="shade" style={{opacity: theme.hero.overlayOpacity}} />
        <div className="content container">
          <div className="kicker">{theme.hero.titleKicker}</div>
          <Image src={theme.brand.logoPath} width={640} height={200} alt="SIERRA" priority />
          <p className="tag" style={{marginTop:8}}>{data.tagline}</p>
          <div style={{marginTop:24}}>
            <a className="button" href="/trailer">Ver tráiler</a>{' '}
            <a className="button" href="/financiacion">Patrocinar</a>
          </div>
          <div style={{marginTop:28}} className="brand-row">
            <span className="kicker">Produce</span>
            <Image src={theme.brand.producerLogo} width={140} height={56} alt="Mulánima" />
          </div>
        </div>
      </div>

      <section className="section paper">
        <div className="container grid">
          <div className="card">
            <h2>Storyline</h2>
            <p>{data.logline}</p>
          </div>
          <div className="card">
            <h2>Estado actual</h2>
            <ul className="list">
              {data.distribution.map((d, i) => <li key={i}>• {d}</li>)}
            </ul>
          </div>
          <div className="card">
            <h2>Impacto social y cultural</h2>
            <ul className="list">
              {data.impact.map((d, i) => <li key={i}>• {d}</li>)}
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
