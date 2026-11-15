import "./globals.css";
import "./tienda/store.css";
import {CartProvider} from "./components/CartProvider";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import ChatBot from "./components/ChatBot";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <div hidden dangerouslySetInnerHTML={{__html: "<!-- SIERRA-V03 THESIS: La película y sus dibujos en el centro. OWN-WORLD: Piedra C4C5C1, tinta 080605, SIERRA CF, Don Reyes, Alumnos y texto American Typewriter con fallback Courier. STORY: conocer la película, elegir una remera, cotizar envío y pagar. FIRST VIEWPORT: fotograma entero sin texto sobre personas; tienda con Franco completo y elección de diseño al lado. FORM: manual v03 confirmado por Juan; implementación sobre sitio existente. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance -->"}} />
        <CartProvider>
        <Nav />
        <main id="contenido">{children}</main>
        <Footer />
        <ChatBot />
        </CartProvider>
      </body>
    </html>
  );
}
