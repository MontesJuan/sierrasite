import './globals.css'
import React from 'react'
import type { Metadata } from 'next'
import Sidebar from './components/Sidebar'
import Footer from './components/Footer' // si lo creaste antes

export const metadata: Metadata = {
  title: 'SIERRA — documental',
  description: 'SIERRA — un documental de Juan F. Montes'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="site-root">
        <div className="layout-grid">
          <Sidebar />
          <main className="site-main">
            {children}
          </main>
        </div>
        <Footer />
      </body>
    </html>
  )
}
