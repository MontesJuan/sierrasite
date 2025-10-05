#!/bin/bash
set -euo pipefail

echo "== Sierra minimal refresh (seguro) =="

# 1) Dependencias mínimas
echo "--> Instalando dependencias mínimas"
npm i @google/generative-ai clsx tailwind-merge >/dev/null 2>&1 || true

# 2) Asegurar estructura KB
echo "--> Verificando KB"
mkdir -p public/kb
[ -f public/kb/kb.json ] && echo "   KB OK: public/kb/kb.json" || echo "   (Aviso) Falta public/kb/kb.json. Generala con tu build-kb.mjs"

# 3) API segura: /api/chat (server-side)
echo "--> Escribiendo app/api/chat/route.ts"
mkdir -p app/api/chat
cat > app/api/chat/route.ts <<'TS'
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

type KBItem = { id: string; source: string; chunk: string; embedding: number[] };
type KBFile = { items: KBItem[] };

/** cache en frío */
let KB: KBFile | null = null;
let norms: number[] = [];

function norm(a: number[]) { let s=0; for (let i=0;i<a.length;i++) s+=a[i]*a[i]; return Math.sqrt(s); }
function dot(a:number[],b:number[]){ let s=0; const n=Math.min(a.length,b.length); for(let i=0;i<n;i++) s+=a[i]*b[i]; return s; }
function cos(a:number[],b:number[],na:number,nb:number){ if(!na||!nb) return 0; return dot(a,b)/(na*nb); }

async function loadKB() {
  const p = path.join(process.cwd(), "public/kb/kb.json");
  const raw = await fs.readFile(p, "utf8");
  KB = JSON.parse(raw);
  norms = KB.items.map((x) => norm(x.embedding));
}

async function embed(genAI: GoogleGenerativeAI, text: string) {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const r = await model.embedContent(text);
  const v = r.embedding?.values;
  if (!v) throw new Error("No embedding");
  return v as number[];
}

export async function POST(req: NextRequest) {
  try {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) return NextResponse.json({ error: "Falta GOOGLE_API_KEY" }, { status: 500 });

    if (!KB) {
      try { await loadKB(); } 
      catch { return NextResponse.json({ error: "No encuentro public/kb/kb.json" }, { status: 500 }); }
    }

    const body = await req.json().catch(() => ({}));
    const userMsg = Array.isArray(body?.messages) 
      ? [...body.messages].reverse().find((m:any)=>m.role==="user")?.content 
      : body?.content;
    const question = String(userMsg||"").slice(0,2000);
    if (!question) return NextResponse.json({ reply: "Decime tu pregunta sobre SIERRA." });

    const genAI = new GoogleGenerativeAI(key);
    const qVec = await embed(genAI, question);
    const qn = norm(qVec);

    const scored = KB!.items
      .map((it, i) => ({ ...it, score: cos(qVec, it.embedding, qn, norms[i]) }))
      .sort((a, b) => b.score - a.score);

    const top = scored.filter(x => x.score >= 0.25).slice(0, 8);
    const context = top.map(x => `(${x.source}) ${x.chunk}`).join("\n---\n");

    const guard = 'Respondé SOLO con la información del CONTEXTO. Si falta info, respondé: "No tengo esa información". Sé breve.';
    const prompt = `${guard}\n\nPREGUNTA:\n${question}\n\nCONTEXTO:\n${context || "(vacío)"}`;

    const chatModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const r = await chatModel.generateContent([{ text: prompt }]);
    const text = r.response.text().trim();

    return NextResponse.json({ reply: text });
  } catch (e:any) {
    const msg = String(e?.message || e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
TS

# 4) Widget flotante minimal que usa /api/chat
echo "--> Escribiendo app/components/chat-bot.tsx"
mkdir -p app/components
cat > app/components/chat-bot.tsx <<'TSX'
"use client";
import { useState, useRef } from "react";
import clsx from "clsx";

type Msg = { role: "user"|"assistant"; content: string };

export default function ChatBot(){
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const pending = useRef(false);

  async function ask(){
    const text = input.trim();
    if(!text || pending.current) return;
    pending.current = true;
    setMsgs(m => [...m, {role:"user", content:text}]);
    setInput("");

    try{
      const r = await fetch("/api/chat", {
        method:"POST",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify({ messages: [...msgs, {role:"user", content:text}] })
      });
      const j = await r.json();
      const reply = (j && (j.reply || j.text)) || "No tengo esa información";
      setMsgs(m => [...m, {role:"assistant", content: String(reply)}]);
    }catch(e:any){
      setMsgs(m => [...m, {role:"assistant", content:"Error al consultar."}]);
    }finally{
      pending.current = false;
    }
  }

  return (
    <>
      {/* botón flotante */}
      <button
        onClick={()=>setOpen(o=>!o)}
        aria-label="Abrir chat"
        style={{
          position:"fixed", right:16, bottom:16, zIndex:9999,
          borderRadius:9999, padding:"12px 16px",
          background:"#111", color:"#fff", border:"none",
          boxShadow:"0 8px 20px rgba(0,0,0,.25)", cursor:"pointer"
        }}
      >
        Chat SIERRA
      </button>

      {/* caja de chat */}
      <div
        style={{
          position:"fixed", right:16, bottom:76, zIndex:9999,
          width:320, maxHeight:"60vh",
          display: open ? "flex" : "none",
          flexDirection:"column", background:"#0b0b0b", color:"#eee",
          border:"1px solid #222", borderRadius:12, overflow:"hidden"
        }}
      >
        <div style={{padding:"8px 12px", borderBottom:"1px solid #222", fontWeight:600}}>Asistente SIERRA</div>
        <div style={{padding:12, display:"flex", gap:8, flexDirection:"column", overflowY:"auto"}}>
          {msgs.length===0 && (
            <div style={{opacity:.8, fontSize:13}}>Preguntame sobre sinopsis, equipo técnico, guion, etc.</div>
          )}
          {msgs.map((m,i)=>(
            <div key={i} className={clsx(m.role==="user" ? "user" : "assistant")} style={{
              alignSelf: m.role==="user" ? "flex-end" : "flex-start",
              background: m.role==="user" ? "#1c1c1c" : "#121212",
              border:"1px solid #222", borderRadius:10, padding:"8px 10px", maxWidth:"90%"
            }}>
              <div style={{opacity:.7, fontSize:11, marginBottom:4}}>{m.role==="user"?"Vos":"Bot"}</div>
              <div style={{whiteSpace:"pre-wrap"}}>{m.content}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex", gap:8, padding:8, borderTop:"1px solid #222"}}>
          <input
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") ask(); }}
            placeholder="Escribí tu pregunta…"
            style={{flex:1, background:"#0e0e0e", color:"#eee", border:"1px solid #222", borderRadius:8, padding:"8px 10px"}}
          />
          <button onClick={ask} disabled={!input.trim()} style={{padding:"8px 12px", borderRadius:8, border:"1px solid #333", background:"#181818", color:"#fff"}}>Enviar</button>
        </div>
      </div>
    </>
  );
}
TSX

# 5) Insertar el widget en el layout (al final del <body>)
echo "--> Parchando app/layout.tsx (agregar ChatBot)"
if ! grep -q 'components/chat-bot' app/layout.tsx 2>/dev/null; then
  # crea un layout básico si no existe
  mkdir -p app
  cat > app/layout.tsx <<'TSX'
import type { Metadata } from "next";
import "./globals.css";
import ChatBot from "./components/chat-bot";

export const metadata: Metadata = {
  title: "SIERRA — Documental",
  description: "Un documental de Juan F. Montes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <ChatBot />
      </body>
    </html>
  );
}
TSX
else
  # intenta agregar <ChatBot /> si faltara
  perl -0777 -pe 'BEGIN{$/=undef}; s#</body>#  <ChatBot />\n    </body>#s' -i app/layout.tsx || true
fi

# 6) Tipografía un poco más chica y look minimal sin tocar mucho
echo "--> Ajustes mínimos en app/globals.css (si existe)"
if [ -f app/globals.css ]; then
  if ! grep -q '--body-size' app/globals.css; then
    cat >> app/globals.css <<'CSS'

/* --- Minimal tweaks --- */
:root{
  --body-size: 15px;
}
html,body{ font-size: var(--body-size); }
nav .nav-logo-link img{ transform: scale(1.15); transform-origin:left center; } /* +15% logo */
.locale-switcher{ display:none !important; } /* ocultar idiomas por ahora */
@media (max-width: 640px){
  .container{ padding: 20px; }
  nav a{ font-size: 90%; }
}
CSS
  fi
fi

echo "Listo. Recordatorio:"
echo "  1) .env.local debe tener GOOGLE_API_KEY=... (NO en el cliente)."
echo "  2) public/kb/kb.json debe existir (npm run kb:build)."
echo "  3) npm run dev (local) / vercel --prod (deploy)."