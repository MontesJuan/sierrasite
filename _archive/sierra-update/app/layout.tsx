
import './globals.css'
import NavBar from './components/NavBar'
import Footer from './components/Footer'

export const metadata = {
  metadataBase: new URL('https://sierradoc.site'),
  title: 'SIERRA — Documental',
  description: 'Un documental de Juan F. Montes'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <NavBar />
        {children}
        <Footer />
      </body>
    </html>
  )
}
