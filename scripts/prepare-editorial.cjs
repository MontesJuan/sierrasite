const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('/Users/juanmontes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = '/Volumes/AZORES/SIERRA/Sierra/09 Relanzamiento/Propuestas';
const sources = JSON.parse(fs.readFileSync(path.join(root,'Dossier v05/composicion-y-procedencia.json'))).sources;
const names = ['portada-16x9.png','logo.png','reyes-escribe.jpg','reyes-perfil.jpg','hilado.jpg','poncho.jpg','escuela-cuadernos.jpg','canon-arrieros.jpg','noche-cabras.jpg','cuaderno-manos.jpg','nino-capucha.jpg','cresta-arrieros.jpg','reyes-ladera.jpg','reyesescribe.png','chivo.png','incaa-b.png','mulanima-b.png','curandero.png'];
(async()=>{
const manifest=[];
for(const name of names){
 const source=sources[name]; const out=name.replace(/\.(jpg|png)$/i,'.webp');
 const dest=path.join(__dirname,'../public/editorial',out);
 await sharp(source.original).rotate().resize({width:name==='portada-16x9.png'?2400:name.endsWith('.png')?1000:1600,withoutEnlargement:true}).webp({quality:88,alphaQuality:100}).toFile(dest);
 manifest.push({file:out,source:source.original,sourceSHA256:source.sha256,sha256:crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex'),kind:name==='portada-16x9.png'?'poster composite, AI assisted; not a documentary frame':'original archival asset, resized without cropping'});
}
fs.copyFileSync(path.join(root,'Dossier v05/SIERRA-Dossier-16x9-v005.pdf'),path.join(__dirname,'../public/prensa/SIERRA-Dossier-16x9-v005.pdf'));
fs.copyFileSync(path.join(root,'Poster 16x9 v01/Sierra-poster-16x9-v01.jpg'),path.join(__dirname,'../public/prensa/SIERRA-Afiche-16x9.jpg'));
fs.writeFileSync(path.join(__dirname,'../content/editorial-provenance.json'),JSON.stringify(manifest,null,2));
console.log('Prepared',manifest.length,'selected assets.');
})();
