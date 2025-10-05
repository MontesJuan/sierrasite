import type { NextApiRequest, NextApiResponse } from "next";
import KB from "../../src/kb/sierra_kb.json";

type KBItem = { id: string; url?: string | null; text: string; embedding: number[] };
const API = "https://generativelanguage.googleapis.com/v1";

function cosine(a: number[], b: number[]) {
  let dot=0, na=0, nb=0;
  for (let i=0;i<a.length;i++){ dot+=a[i]*b[i]; na+=a[i]*a[i]; nb+=b[i]*b[i]; }
  const d=Math.sqrt(na)*Math.sqrt(nb);
  return d? dot/d : 0;
}

async function embedQuery(text: string, key: string) {
  const r = await fetch(`${API}/models/text-embedding-004:embedContent?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: { parts: [{ text }] } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || JSON.stringify(j));
  return j.embedding.values as number[];
}

function pickText(resp: any): string {
  const cands = resp?.candidates;
  const parts = cands?.[0]?.content?.parts;
  const txt = parts?.map((p: any) => p.text).filter(Boolean).join("\n");
  return txt || "";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") { res.status(200).send("ok"); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "METHOD_NOT_ALLOWED" }); return; }

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) { res.status(500).json({ error: "MISSING_GEMINI_KEY" }); return; }

    const messages = (req.body as any)?.messages || [];
    const userMsg = [...messages].reverse().find((m:any)=>m.role==="user")?.content || "";

    const q = await embedQuery(userMsg, key);

    const top = (KB as KBItem[])
      .map(it=>({ ...it, score:cosine(q,it.embedding) }))
      .sort((a,b)=>b.score-a.score)
      .slice(0,5);

    const context = top.map((s,i)=>`[${i+1}] ${s.text}`).join("\n---\n");

    const instructions = "Eres el bot del documental SIERRA. Responde en español, claro y conciso. Usa únicamente el CONTEXTO; si falta, responde: “No lo tengo en mi base de conocimiento por ahora.” Agrega [n] cuando cites algo concreto.";

    const fullPrompt = `${instructions}

Pregunta: ${userMsg}

CONTEXTO:
${context}

Responde en ≤120 palabras y agrega [n] cuando corresponda.`;

    const r = await fetch(`${API}/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0.3 }
      }),
    });

    const j = await r.json();
    if (!r.ok) { res.status(500).json({ error: "GEMINI_RAG_ERROR", details: j?.error?.message || JSON.stringify(j) }); return; }

    const reply = pickText(j) || "No lo tengo en mi base de conocimiento por ahora.";
    res.status(200).json({ reply, citations: top.map((s,i)=>({ n:i+1, url:s.url??null, id:s.id })) });
  } catch (e:any) {
    res.status(500).json({ error: "GEMINI_RAG_ERROR", details: String(e?.message||e) });
  }
}
