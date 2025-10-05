import Image from 'next/image'
import theme from '../data/theme.json'

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="card brand" style={{ textAlign: 'center' }}>
          <div className="kicker">Produce</div>
          <div style={{ display: 'flex', gap: 18, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <Image src={theme.brand.producerLogo} width={98} height={39} alt="Mulánima" />
            <Image src="/assets/logos/incaa.png" width={262} height={105} alt="INCAA" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start', marginTop: 20 }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontWeight: 700, letterSpacing: '.12em' }}>SIERRA</div>
            <p className="small">Largometraje documental (2025), 75 min. San Juan, Argentina.</p>
          </div>

          <div style={{ flex: 1, minWidth: 260, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div>Contacto</div>
            <div className="small" style={{ textAlign: 'right' }}>
              <p>
                <a
                  href="https://www.instagram.com/sierra.docu/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                  aria-label="Instagram de SIERRA"
                >
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 448 512">
                    <path
                      fill="currentColor"
                      d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9S160.5 370.9 224.1 370.9 339 319.6 339 256 287.7 141 224.1 141zm0 188.6A73.7 73.7 0 1 1 297.9 256a73.7 73.7 0 0 1-73.8 73.6zm146.4-194.3a26.6 26.6 0 1 1-26.6-26.6 26.6 26.6 0 0 1 26.6 26.6zM398.8 80A93.9 93.9 0 0 0 352 64H96A96 96 0 0 0 0 160v256a96 96 0 0 0 96 96h256a96 96 0 0 0 96-96V160a93.9 93.9 0 0 0-15.2-47.9zM400 416a48 48 0 0 1-48 48H96a48 48 0 0 1-48-48V160a48 48 0 0 1 48-48h256a48 48 0 0 1 48 48z"
                    />
                  </svg>
                  <span>@sierra.docu</span>
                </a>
              </p>
              <div><a href="mailto:mulanimavisual@gmail.com">mulanimavisual@gmail.com</a></div>
              <div>+54 2645 101344</div>
            </div>
          </div>
        </div>

        <div className="small" style={{ marginTop: 16 }}>
          © {new Date().getFullYear()} Sierra — Un documental de Juan Francisco Montes.
        </div>
      </div>
    </footer>
  )
}