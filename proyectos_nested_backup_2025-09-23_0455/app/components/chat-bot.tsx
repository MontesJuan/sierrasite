"use client";

import React from "react";

type Role = "user" | "assistant";
type Msg = { role: Role; content: string };

export default function ChatBot() {
  const [open, setOpen] = React.useState(false);

  const [messages, setMessages] = React.useState<Msg[]>([
    {
      role: "assistant" as const,
      content:
        "Hola, soy el asistente de SIERRA. Preguntame sobre sinopsis, equipo, distribución o dónde ver el tráiler.",
    },
  ]);

  const [input, setInput] = React.useState("");

  async function send() {
    const text = input.trim();
    if (!text) return;

    // 👇 Forzamos los literales y el tipo del array
    const next: Msg[] = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const j = await r.json();
      const reply = (j?.text as string) || "No tengo esa información.";

      setMessages((m) => [
        ...m,
        { role: "assistant" as const, content: reply },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant" as const, content: "Hubo un error de conexión." },
      ]);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 9999,
          borderRadius: 9999,
          padding: "12px 16px",
          background: "#111",
          color: "#fff",
          border: "none",
          boxShadow: "0 8px 20px rgba(0,0,0,.25)",
          cursor: "pointer",
        }}
        aria-label="Abrir chat"
      >
        {open ? "Cerrar chat" : "Chat SIERRA"}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            right: 16,
            bottom: 72,
            width: 360,
            maxWidth: "calc(100vw - 32px)",
            height: 480,
            maxHeight: "calc(100vh - 120px)",
            background: "#1a1a1a",
            color: "#eaeaea",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 16px 40px rgba(0,0,0,.35)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              fontWeight: 600,
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Asistente — SIERRA
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 12,
              gap: 8,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? "#2a2a2a" : "#0f172a",
                  color: "#e5e7eb",
                  padding: "8px 10px",
                  borderRadius: 8,
                  maxWidth: "80%",
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            style={{
              display: "flex",
              gap: 8,
              padding: 8,
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribí tu pregunta…"
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#0b0b0b",
                color: "#fff",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#111827",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}