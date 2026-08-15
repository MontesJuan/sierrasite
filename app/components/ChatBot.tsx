"use client";

import { FormEvent, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "Hola, soy el bot de SIERRA. Preguntame sobre el proyecto." }]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user", content: text } as Message];
    setMessages(next); setInput(""); setLoading(true); setError("");
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next }) });
      if (!response.ok) { const body = await response.text(); throw new Error(`HTTP ${response.status}: ${body}`); }
      const data = await response.json();
      if (!data?.reply) { setMessages((m) => [...m, { role: "assistant", content: "No tengo esa información." }]); return; }
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      setMessages((m) => [...m, { role: "assistant", content: "Fallo de red." }]);
    } finally { setLoading(false); }
  }

  return <>
    {open && <div style={{ position: "fixed", right: 16, bottom: 72, zIndex: 9998, width: "min(420px, 92vw)", maxHeight: "70vh", background: "#0f0f0f", color: "#f2f2f2", border: "1px solid #222", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 12px", background: "#111", borderBottom: "1px solid #222", fontWeight: 600 }}>Chat · SIERRA</div>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
        {messages.map((m, i) => <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", background: m.role === "user" ? "#1f2937" : "#111", border: "1px solid #222", padding: "8px 10px", borderRadius: 8, maxWidth: "85%", whiteSpace: "pre-wrap" }}>{m.content}</div>)}
        {error && <div style={{ color: "#ff6b6b", fontSize: 12 }}>{error}</div>}
      </div>
      <form onSubmit={submit} style={{ padding: 12, display: "flex", gap: 8, borderTop: "1px solid #222" }}>
        <input value={input} disabled={loading} onChange={(e) => setInput(e.target.value)} placeholder={loading ? "Esperá…" : "Escribí tu pregunta sobre SIERRA"} style={{ flex: 1, background: "#0c0c0c", color: "#eee", border: "1px solid #222", borderRadius: 8, padding: "10px 12px" }} />
        <button disabled={loading || !input.trim()} style={{ border: 0, borderRadius: 8, padding: "10px 14px", background: "#e5e5e5", color: "#111", cursor: "pointer", opacity: loading ? .6 : 1 }}>{loading ? "…" : "Enviar"}</button>
      </form>
    </div>}
    <button aria-label={open ? "Cerrar chat" : "Abrir chat"} onClick={() => setOpen((v) => !v)} style={{ position: "fixed", right: 16, bottom: 16, zIndex: 9999, borderRadius: 9999, padding: "12px 16px", background: "#111", color: "#fff", border: "none", boxShadow: "0 8px 20px rgba(0,0,0,.25)", cursor: "pointer" }}>{open ? "Cerrar chat" : "Chat SIERRA"}</button>
  </>;
}
