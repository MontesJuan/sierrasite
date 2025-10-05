import theme from '../data/theme.json'
import Image from 'next/image'

export default function Page() {
  const storyline = `“Sierra” is a deep journey into the heart of the mountains, where people merge with nature in a micro-cosm with its own rules, forged by isolation and time.
In Vallecito—the most remote corner of the Elizondo Range—Ladislao Reyes Chávez, a herder and popular poet, treasures more than eight hundred handwritten poems, hoping to turn them into a book. With the help of the boarding-school students who digitize his notebooks, mountain life unfolds in its harshness and beauty: endless mule rides, inherited crafts, a profound bond with nature, and the resistance of traditions at risk of disappearing.
Will Reyes fulfill the dream of publishing his book? Will the arrival of the “Camino de los Sueños” bring true progress or forever reshape the identity of the mountain people?`

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
            <a className="button" href="/en/trailer">Watch trailer</a>{' '}
            <a className="button" href="/en/collaborate">Collaborate</a>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <h2>Story Line</h2>
          <p style={{whiteSpace:'pre-wrap'}}>{storyline}</p>
        </div>
      </section>
    </main>
  )
}
