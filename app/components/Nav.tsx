"use client";
import Link from "next/link";
import Icon from "./Icon";
import { usePathname } from "next/navigation";
import { useState } from "react";
export default function Nav() {
  const path = usePathname() || "/";
  const en = path.startsWith("/en");
  const [open, setOpen] = useState(false);
  return (
    <>
      <a className="skip-link" href="#contenido">
        {en ? "Skip to content" : "Saltar al contenido"}
      </a>
      <header className="header">
        <Link
          href={en ? "/en" : "/"}
          aria-label="SIERRA — inicio"
          onClick={() => setOpen(false)}
        >
          <img
            className="nav-logo"
            src="/editorial/logo.webp"
            alt="SIERRA"
            width="124"
            height="25"
          />
        </Link>
        <div id="assistant-entry" />
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? (en ? "Close" : "Cerrar") : "Menú"}{" "}
          <Icon name={open ? "minus" : "plus"} />
        </button>
        <nav
          id="navigation"
          className={open ? "nav-open" : ""}
          aria-label={en ? "Main navigation" : "Navegación principal"}
        >
          {[
            [
              en ? "/en/synopsis" : "/sinopsis",
              en ? "The film" : "La película",
            ],
            [en ? "/en/gallery" : "/galeria", en ? "Images" : "Imágenes"],
            [en ? "/en/press" : "/prensa", en ? "Press" : "Prensa"],
            [en ? "/en/contact" : "/contacto", en ? "Contact" : "Contacto"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <a href="/jugar" onClick={() => setOpen(false)}>
            {en ? "Play" : "Jugar"}
          </a>
          <Link
            className="language"
            href={en ? "/" : "/en"}
            lang={en ? "es" : "en"}
            onClick={() => setOpen(false)}
          >
            {en ? "ES" : "EN"}
          </Link>
        </nav>
      </header>
    </>
  );
}
