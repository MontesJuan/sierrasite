"use client";
import React from "react";
type Msg = { role: "user" | "assistant"; content: string; citations?: { n:number; url:string|null; id:string }[] };
export default function ChatBot() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Msg[]>([
    { role: "assistant", content: "Hola, soy el bot de SIERRA. Preguntame algo del proyecto." },
  ]);
  const [input, setInput] = React.useState(""); const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  async function send() {
    const text = input.trim(); if (!text || loading) return;
    setLoading(true); setError(null);
    const next = [...messages, { role: "user" as const, content: text }]; setMessages(next); setInput("");
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next }) });
      const raw = await res.text(); let data:any=null; try{ data=JSON.parse(raw);}catch{}
      if (!res.ok){ const msg=data?.error||`Error ${res.status}`; setError(msg); setMessages([...next,{role:"assistant",content:msg}]); return; }
      const reply = data?.reply || "No pude responder ahora."; const citations = data?.citations || [];
      setMessages([...next, { role: "assistant", content: reply, citations }]);
    } catch { const msg="No pude conectar."; setError(msg); setMessages([...messages,{role:"assistant",content:msg}]); }
    finally { setLoading(false); }
  }
  return (
    <>
      {!open && (
        <button onClick={()=>setOpen(true)} className="fixed bottom-4 right-4 z-[9999] rounded-full bg-white/90 text-black px-4 py-2 text-sm shadow-lg">Chat SIERRA</button>
      )}
      {open && (
        <div className="fixed bottom-4 right-4 z-[9999] w-[95vw] sm:w-[380px] max-h-[80vh] rounded-2xl bg-black/85 text-white p-3 backdrop-blur shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Chat · SIERRA</span>
            <button onClick={()=>setOpen(false)} className="text-xs opacity-70 hover:opacity-100">✕</button>
          </div>
          <div className="h-[60vh] sm:h-72 overflow-y-auto space-y-2 pr-1">
            {messages.map((m,i)=>(
              <div key={i} className={m.role==="user"?"text-right":"text-left"}>
                <div className={`inline-block rounded-lg px-3 py-2 text-sm leading-relaxed ${m.role==="user"?"bg-white/10":"bg-white/5"}`} style={{whiteSpace:"pre-wrap"}}>
                  {m.content}
                  {m.role==="assistant" && m.citations?.length ? (
                    <div className="mt-1 text-[11px] opacity-70">
                      {m.citations.map((c:any)=> c.url ? <a key={c.id} href={c.url} target="_blank" className="underline mr-1">[{c.n}]</a> : <span key={c.id}>[{c.n}] </span>)}
                    </div>
                  ):null}
                </div>
              </div>
            ))}
            {loading && <div className="text-left"><div className="inline-block rounded-lg px-3 py-2 text-sm bg-white/5">Escribiendo…</div></div>}
          </div>
          <div className="mt-2 flex gap-2">
            <input value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&send()} placeholder="Escribí tu pregunta" className="flex-1 rounded-md bg-white/10 px-3 py-2 text-sm outline-none focus:bg-white/15"/>
            <button onClick={send} disabled={loading||!input.trim()} className="rounded-md bg-white/90 text-black px-3 py-2 text-sm disabled:opacity-50">Enviar</button>
          </div>
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>
      )}
    </>
  );
}
