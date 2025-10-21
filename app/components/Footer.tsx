'use client'
import React from 'react'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer py-8 border-t border-sierra-dark/10">
      <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-4">
        <div className="brand flex flex-col items-center">
          <img src="/logos/sierra-wordmark.png" alt="Marca SIERRA" className="h-12 md:h-16" />
          <img src="/logos/mulanima.png" alt="Mulanima" className="h-8 md:h-10 mt-2 opacity-90" />
        </div>

        <nav aria-label="Navegación del sitio" className="text-sm text-sierra-dark/70 flex gap-4">
          <a href="#sinopsis" className="hover:underline">Sinopsis</a>
          <a href="#trailer" className="hover:underline">Tráiler</a>
          <a href="#galeria" className="hover:underline">Galería</a>
        </nav>

        <p className="text-xs text-sierra-dark/60">© {year} SIERRA — Todos los derechos reservados</p>
      </div>
    </footer>
  )
}
