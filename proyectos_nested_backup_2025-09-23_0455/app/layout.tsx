import './globals.css';
import type { Metadata } from 'next';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import ChatBot from './components/chat-bot';
export const metadata: Metadata = {
  title: 'SIERRA — Documental'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <NavBar />
        {children}
        <Footer />
        <ChatBot />
      </body>
    </html>
  );
}