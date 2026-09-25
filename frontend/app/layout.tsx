import type { Metadata } from "next";
import "./globals.css";
import "@livekit/components-styles";

export const metadata: Metadata = {
  title: "Jarvis - Multimodal Voice AI",
  description: "Jarvis - Real-time Voice & Vision Multimodal AI Assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0E14] text-white min-h-screen flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
