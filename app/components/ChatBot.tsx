"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import { usePathname } from "next/navigation";
type Message = {
  role: "user" | "assistant";
  text: string;
  sources?: { title: string; url: string }[];
};
export default function ChatBot() {
  const [entry, setEntry] = useState<HTMLElement | null>(null);
  useEffect(() => setEntry(document.getElementById("assistant-entry")), []);
  const en = (usePathname() || "/").startsWith("/en");
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    list.current?.scrollTo({
      top: list.current.scrollHeight,
      behavior: "instant",
    });
  }, [messages, busy]);
  async function ask(question: string) {
    if (busy || !question.trim()) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, locale: en ? "en" : "es" }),
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error();
      const j = await r.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", text: j.answer, sources: j.sources },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: en
            ? "The assistant is unavailable. Try again or write to montesjuanfrancisco@gmail.com."
            : "El asistente no está disponible. Volvé a intentar o escribí a montesjuanfrancisco@gmail.com.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {entry &&
        createPortal(
          <button
            className="chat-trigger"
            onClick={() => dialog.current?.showModal()}
            aria-haspopup="dialog"
            aria-label={en ? "Ask about SIERRA" : "Conversar sobre SIERRA"}
          >
            {en ? "Ask SIERRA" : "Conversar"} <Icon name="arrow" />
          </button>,
          entry,
        )}
      <dialog className="chat-dialog" ref={dialog} aria-labelledby="chat-title">
        <div className="chat-head">
          <h2 id="chat-title">{en ? "About SIERRA" : "Hablemos de SIERRA"}</h2>
          <p>
            {en
              ? "Film information assistant"
              : "Asistente de información de la película"}
          </p>
          <button
            className="close"
            onClick={() => dialog.current?.close()}
            aria-label={en ? "Close assistant" : "Cerrar asistente"}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="chat-messages" ref={list} role="log" aria-live="polite">
          {messages.length === 0 ? (
            <p>
              {en
                ? "I can help with the story, trailer, characters and press materials. What would you like to know?"
                : "Puedo ayudarte con la historia, el tráiler, sus protagonistas y los materiales de prensa. ¿Qué querés saber?"}
            </p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={"chat-message " + m.role}>
                <strong>
                  {m.role === "user" ? (en ? "You" : "Vos") : "SIERRA"}
                </strong>
                {m.text}
                {m.sources?.map((s) => (
                  <a
                    className="chat-source"
                    href={s.url}
                    key={s.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {s.title} <Icon name="arrow" />
                  </a>
                ))}
              </div>
            ))
          )}
          {busy && (
            <p>{en ? "Looking up information…" : "Consultando información…"}</p>
          )}
        </div>
        <div className="chat-options">
          {(en
            ? ["Trailer", "Screenings", "Press dossier"]
            : ["Tráiler", "Proyecciones", "Dossier de prensa"]
          ).map((q) => (
            <button key={q} disabled={busy} onClick={() => ask(q)}>
              {q}
            </button>
          ))}
        </div>
        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <input
            aria-label={en ? "Your question" : "Tu consulta"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={1200}
            placeholder={
              en ? "Ask about the film…" : "Preguntá sobre la película…"
            }
            required
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label={en ? "Send question" : "Enviar consulta"}
          >
            <Icon name="send" />
          </button>
        </form>
        <p className="chat-privacy">
          {en
            ? "Public information only. Please do not send personal data."
            : "Sólo información pública. No envíes datos personales."}{" "}
          <a href="/privacidad">{en ? "Privacy" : "Privacidad"}</a>
        </p>
      </dialog>
    </>
  );
}
