import Image from 'next/image'

export default function FooterEn() {
  return (
    <footer>
      <div className="container">
        <div className="card brand" style={{ textAlign:'center' }}>
          <div className="kicker">Produced by</div>
          <div style={{ display:'flex', gap:18, justifyContent:'center', alignItems:'center', flexWrap:'wrap', marginTop:8 }}>
            <Image src="/assets/logos/mulanima.png" alt="Mulánima" width={98} height={39} />
            <Image src="/assets/logos/incaa.png" alt="INCAA" width={262} height={105} />
          </div>
        </div>

        <div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'flex-start', marginTop:20 }}>
          <div style={{ flex:1, minWidth:260 }}>
            <div style={{ fontWeight:700, letterSpacing:'.12em' }}>SIERRA</div>
            <p className="small">Feature documentary (2025), 75 min. San Juan, Argentina.</p>
          </div>

          <div style={{ flex:1, minWidth:260, textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
            <div>Contact</div>
            <div className="small" style={{ textAlign:'right' }}>
              <div>@sierra.docu</div>
              <div><a href="mailto:mulanimavisual@gmail.com">mulanimavisual@gmail.com</a></div>
              <div>+54 2645 101344</div>
            </div>
          </div>
        </div>

        <div className="small" style={{ marginTop:16 }}>
          © 2025 Sierra — A documentary by Juan Francisco Montes.
        </div>
      </div>
    </footer>
  )
}