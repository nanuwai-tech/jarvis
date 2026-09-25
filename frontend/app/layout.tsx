import type { Metadata } from "next";
import "./globals.css";
import "@livekit/components-styles";

export const metadata: Metadata = {
  title: "Jarvis Hologram",
  description: "Jarvis - Holographic Multimodal Voice Assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark m-0 p-0 overflow-hidden">
      <body className="bg-[#010408] text-white m-0 p-0 overflow-hidden w-screen h-screen select-none">
        {children}
      </body>
    </html>
  );
}
