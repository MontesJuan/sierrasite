import './globals.css'
import React from 'react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-black">
        {children}
      </body>
    </html>
  )
}