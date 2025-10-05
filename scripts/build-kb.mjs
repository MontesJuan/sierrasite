import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");
const KB_DIR = path.join(ROOT, "kb");
const OUT = path.join(ROOT, "src", "kb", "sierra_kb.json");
const API = "https://generativelanguage.googleapis.com/v1";
const KEY = process.env.GEMINI_API_KEY;

function normalize(t){ return t.replace(/\s+/g," ").trim(); }
function chunkText(text,maxChars=1800,overlap=150){
  const out=[]; let i=0;
  while(i<text.length){ const end=Math.min(i+maxChars,text.length); out.push(text.slice(i,end)); if(end===text.length) break; i=end-overlap; }
  return out.map(s=>s.trim()).filter(Boolean);
}
async function embed(text){
  const r = await fetch(`${API}/models/text-embedding-004:embedContent?key=${KEY}`,{
    method:"POST",
    headers:{ "content-type":"application/json" },
    body: JSON.stringify({ content:{ parts:[{ text }] } })
  });
  const j = await r.json();
  if(!r.ok) throw new Error(JSON.stringify(j));
  return j.embedding.values;
}
async function listFiles(dir){
  const ents = await fs.readdir(dir, { withFileTypes:true });
  return ents.filter(e=>e.isFile() && /\.(md|txt)$/i.test(e.name))
             .map(e=>path.join(dir, e.name))
             .sort();
}
async function main(){
  const files = await listFiles(KB_DIR);
  if(!files.length) throw new Error("No se encontraron archivos .md/.txt en /kb");
  const kb = [];
  for(const f of files){
    const raw = await fs.readFile(f, "utf8");
    const base = path.basename(f).replace(/\.(md|txt)$/i,"");
    const idBase = base.toLowerCase().replace(/[^a-z0-9]+/g,"-");
    const parts = chunkText(normalize(raw));
    for(let i=0;i<parts.length;i++){
      kb.push({ id:`${idBase}-${i}`, url:`/${idBase}`, text:parts[i], embedding:await embed(parts[i]) });
    }
  }
  await fs.mkdir(path.dirname(OUT), { recursive:true });
  await fs.writeFile(OUT, JSON.stringify(kb));
  console.log("KB generada:", OUT, "chunks:", kb.length);
}
main().catch(e=>{ console.error(e); process.exit(1); });
