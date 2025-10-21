'use client'
import React from 'react'

export default function Sidebar() {
  return (
    <aside className="site-sidebar" aria-label="Navegación principal">
      <div className="brand-stack">
        <div className="brand-line">SI</div>
        <div className="brand-line">ER</div>
        <div className="brand-line">RA</div>
      </div>

      <nav className="sidebar-nav" aria-label="Enlaces">
        <a href="#sinopsis">Sinopsis</a>
        <a href="#trailer">Tráiler</a>
        <a href="#galeria">Galería</a>
        <a href="#contacto">Contacto</a>
      </nav>

      <div className="sidebar-credit">Una producción de Mulanima</div>
    </aside>
  )
}