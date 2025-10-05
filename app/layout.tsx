import dynamic from "next/dynamic";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const ChatBot = dynamic(() => import("@/components/ChatBot"), { ssr: false });
  return (<html lang="es"><body>{children}<ChatBot /></body></html>);
}
