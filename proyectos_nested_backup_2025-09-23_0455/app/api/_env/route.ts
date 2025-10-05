import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";

type Msg = { role: "user" | "assistant"; content: string };

type KBItem = {
  id: string;
  source: string;
  chunk: string;
  embedding: number[];
};

type KB = { items: KBItem[] };

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    const va = a[i], vb = b[i];
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

async function readKB(): Promise<KB> {
  const file = path.resolve(process.cwd(), "public/kb/kb.json");
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw) as KB;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: Msg[] = Array.isArray(body?.messages) ? body.messages : [];
    const question = messages.findLast?.((m: Msg) => m.role === "user")?.content ?? "";

    const key = process.env.GOOGLE_API_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: "Falta GOOGLE_API_KEY" }), { status: 500 });
    }

    // --- Embeddings (FIX: pasar string o incluir role:'user') ---
    const genAI = new GoogleGenerativeAI(key);
    const embedder = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const embedText = async (text: string) => {
      // Opción 1 (recomendada): pasar string directamente
      const { embedding } = await embedder.embedContent(text);
      // Opción 2 (equivalente):
      // const { embedding } = await embedder.embedContent({ content: { role: "user", parts: [{ text }] } });
      return embedding?.values ?? [];
    };

    // Vectorizar la pregunta
    const qVec = await embedText(question);

    // Buscar en la KB
    const kb = await readKB();
    const scored = kb.items
      .map(item => ({ item, score: cosine(qVec, item.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const topChunks = scored.map(s => s.item);
    const contextText =
      topChunks
        .map(s => `### Fuente: ${s.source} — ${s.id}\n${s.chunk}`)
        .join("\n\n---\n\n");

    // Instrucciones para ACOTAR al tema SIERRA
    const SYSTEM_RULES = `
Eres el asistente del sitio oficial del documental SIERRA.
Responde SOLO con información presente en el contexto proporcionado (extractos de la base kb/).
Si la pregunta no está respondida en el contexto, di de forma clara: "No tengo esa información aún."
Sé breve y directo. Español neutro. Añade una breve lista de fuentes al final si corresponde.
`;

    const prompt = `
${SYSTEM_RULES}

[CONTEXTO]
${contextText}

[PREGUNTA]
${question}
`;

    const chatModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await chatModel.generateContent(prompt);
    const text = result.response.text();

    const sources = Array.from(new Set(topChunks.map(s => s.source)));

    return new Response(JSON.stringify({ answer: text, sources }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500 });
  }
}