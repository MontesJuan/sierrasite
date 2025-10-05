
import Image from 'next/image'
import theme from '../data/theme.json'

export const metadata = { title: 'Prensa — Sierra' }

export default function Page() {
  const stills = ['/assets/stills/still01.jpg','/assets/stills/still02.jpg','/assets/stills/still03.jpg','/assets/stills/still04.jpg','/assets/stills/still05.jpg']
  return (
    <main className="section">
      <div className="container">
        <h2>Prensa</h2>
        <div className="grid" style={{marginTop:12}}>
          {stills.map((src,i)=>(
            <div key={i} className="card">
              <Image src={src} width={1200} height={675} style={{width:'100%', height:'auto'}} alt={`Still ${i+1}`} />
              <div style={{marginTop:8}}><a className="btn" href={src} download>Descargar</a></div>
            </div>
          ))}
          <div className="card">
            <h3>Isologotipos</h3>
            <div style={{display:'flex', gap:16, alignItems:'center', flexWrap:'wrap'}}>
              <Image src={theme.brand.logoPath} width={300} height={100} alt="Logo SIERRA"/>
              <Image src={theme.brand.producerLogo} width={160} height={64} alt="Mulánima"/>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
