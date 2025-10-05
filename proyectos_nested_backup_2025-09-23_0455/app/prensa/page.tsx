import fs from 'fs'
import path from 'path'

export const metadata = { title: 'Prensa — Sierra' }

function listPress() {
  const dir = path.join(process.cwd(), 'public/assets/press')
  const ok = /\.(pdf|zip|png|jpe?g|webp|svg|docx?|rtf|txt|mp4|mov)$/i
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(f => ok.test(f)).sort().map(f => ({
    name: f,
    href: `/assets/press/${f}`
  }))
}

export default function Page() {
  const files = listPress()
  return (
    <main className="section">
      <div className="container">
        <h2>Prensa</h2>
        <div className="card" style={{marginTop:12}}>
          <h3 style={{marginTop:0}}>MATERIAL PRENSA</h3>
          {files.length === 0 ? (
            <p className="small">Subí tus archivos a <code>/public/assets/press</code> y publicá.</p>
          ) : (
            <ul className="list" style={{marginTop:8}}>
              {files.map((f, i) => (
                <li key={i} style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}>
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.name}</span>
                  <a className="btn" href={f.href} download>Descargar</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
