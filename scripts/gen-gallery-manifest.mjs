import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const base = process.argv[2] || 'public/assets/galeria_web'
const list = dir =>
  readdirSync(dir)
    .filter(f => /\.(webp|jpg|jpeg|png|gif)$/i.test(f))
    .sort((a,b)=>a.localeCompare(b,'es',{numeric:true}))

const backstage = list(join(base,'backstage')).map(f => `/assets/galeria_web/backstage/${f}`)
const stills    = list(join(base,'stills')).map(f => `/assets/galeria_web/stills/${f}`)

const json = { backstage, stills }
writeFileSync('app/data/gallery.json', JSON.stringify(json,null,2))
console.log('Manifest:', 'app/data/gallery.json', `(${backstage.length+stills.length} imágenes)`)
