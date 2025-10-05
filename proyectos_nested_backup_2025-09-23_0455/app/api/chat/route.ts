import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ensureKBLoaded, searchKB } from "@/lib/sierra-kb-adapter";

export const runtime = "nodejs";

type Msg = { role: "user" | "assistant" | "system"; content: string };

function getTextContent(c: any): string {
  if (!c) return "";
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c
      .map((p) => (typeof p === "string" ? p : p?.text ?? p?.content ?? ""))
      .join(" ")
      .trim();
  }
  return c.text ?? c.content ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "Falta GOOGLE_API_KEY" },
        { status: 500 },
      );
    }

    // Body tolerante (viene de tu widget)
    const body = await req.json();
    const raw: any[] = Array.isArray(body?.messages) ? body.messages : [];
    const messages: Msg[] = raw.map((m) => ({
      role:
        m?.role === "assistant"
          ? "assistant"
          : m?.role === "system"
          ? "system"
          : "user",
      content: getTextContent(m?.content),
    }));

    const question =
      [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    if (!question.trim()) {
      return NextResponse.json({
        text: "Decime tu pregunta sobre la película SIERRA.",
      });
    }

    // Cargar KB y buscar contexto
    const genAI = new GoogleGenerativeAI(key);
    await ensureKBLoaded();
    const { context, sources } = await searchKB(genAI, question, {
      minScore: 0.25,
      topK: 8,
    });

    // Guard: limitamos el tema a SIERRA
    const system =
      'Respondé SOLO con la información del CONTEXTO. Si falta info, respondé exactamente: "No tengo esa información". Sé breve y específico.';

    const prompt = `${system}

PREGUNTA:
${question}

CONTEXTO:
${context || "(vacío)"}`;

    const chatModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const r = await chatModel.generateContent([{ text: prompt }]);
    const text = (r.response.text() || "").trim();

    return NextResponse.json({
      text: text || "No tengo esa información.",
      sources,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500 },
    );
  }
}