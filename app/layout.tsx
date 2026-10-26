import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "./globals.css";
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
        <Nav />
        <main id="contenido">{children}</main>
        <Footer />
        <ChatBot />
      </body>
    </html>
  );
}
