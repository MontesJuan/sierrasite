import data from '../data/siteData.json'

export const metadata = { title: 'Contacto — Sierra' }

export default function Page() {
  const c = data.contact
  return (
    <main className="section">
      <div className="container">
        <h2>Contacto</h2>
        <div className="grid" style={{marginTop:12}}>
          <div className="card">
            <h3>Producción</h3>
            <p className="small">Mulánima</p>
            <p>
              <a href={`mailto:${c.email}`}>{c.email}</a><br/>
              <a href={`https://wa.me/${c.whatsapp}`} target="_blank">WhatsApp {c.phone}</a><br/>
              <a href="https://instagram.com/sierra.docu" target="_blank">@{c.instagram}</a>
            </p>
          </div>
          <div className="card">
            <h3>Prensa y proyecciones</h3>
            <p className="small">Consultas de prensa, funciones educativas y festivales.</p>
            <p>
              <a className="btn" href="/prensa">Ir a Prensa</a>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}