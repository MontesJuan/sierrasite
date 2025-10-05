
import Image from 'next/image'
import theme from '../data/theme.json'

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div style={{display:'flex', gap:24, flexWrap:'wrap'}}>
          <div style={{flex:1, minWidth:260}}>
            <div style={{fontWeight:700, letterSpacing:'.12em'}}>SIERRA</div>
            <p className="small">Largometraje documental (2025), 75 min. San Juan, Argentina.</p>
          </div>
          <div style={{flex:1, minWidth:260}}>
            <div>Contacto</div>
            <div className="small">
              <div>@sierra.docu</div>
              <div><a href="mailto:mulanimavisual@gmail.com">mulanimavisual@gmail.com</a></div>
              <div>+54 2645 101344</div>
            </div>
          </div>
          <div style={{flexBasis:'100%', height:1}} />
          <div className="card brand" style={{flex:1, minWidth:260}}>
            <div className="kicker">Produce</div>
            <Image src={theme.brand.producerLogo} width={160} height={64} alt="Mulánima" />
          </div>
        </div>
        <div className="small" style={{marginTop:16}}>© {new Date().getFullYear()} Sierra — Un documental de Juan Francisco Montes.</div>
      </div>
    </footer>
  )
}
