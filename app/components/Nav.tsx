"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

const links = [
  { href: "/sinopsis", label: "SINOPSIS" },
  { href: "/trailer", label: "TRÁILER" },
  { href: "/impacto", label: "IMPACTO SOCIAL" },
  { href: "/equipo", label: "EQUIPO" },
  { href: "/financiacion", label: "COLABORAR" },
  { href: "/distribucion", label: "DISTRIBUCIÓN" },
  { href: "/estado-actual", label: "ESTADO ACTUAL" },
  { href: "/galeria", label: "GALERÍA" },
  { href: "/contacto", label: "CONTACTO" },
  { href: "/prensa", label: "PRENSA" },
];

export default function Nav() {
  const pathname = usePathname();
  return <nav style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 12px", minHeight: 50 }}>
    <a style={{ display: "inline-flex", alignItems: "center", gap: 12 }} href="/">
      <Image alt="SIERRA" src="/assets/logos/sierra-wordmark.png" width={150} height={44} sizes="(max-width: 768px) 35vw, 150px" style={{ width: "auto", height: 34 }} />
    </a>
    {links.map((link) => <a key={link.href} className={pathname === link.href ? "active" : ""} style={{ fontSize: "82%", lineHeight: 1, padding: "4px 6px", display: "inline-block" }} href={link.href}>{link.label}</a>)}
    <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", gap: 2 }}>
      <a className="btn" href="/trailer" style={{ padding: "6px 12px", lineHeight: 1 }}>VER TRÁILER</a>
      <div style={{ display: "flex", gap: 6, fontSize: "72%", opacity: .9 }}><a href="/" rel="nofollow">ES</a><span style={{ opacity: .5 }}>•</span><a href="/en" rel="nofollow">EN</a></div>
    </div>
  </nav>;
}
