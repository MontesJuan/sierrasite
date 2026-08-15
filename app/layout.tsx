import "./globals.css";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import ChatBot from "./components/ChatBot";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body><Nav />{children}<Footer /><ChatBot /></body></html>;
}
