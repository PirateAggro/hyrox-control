import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hyrox Control",
  description: "Cronometratge d'estacions, transicions i runs de Hyrox",
  // Icona de la pestanya i de la drecera a la pantalla d'inici (iPhone).
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  // A l'iPhone, la drecera s'obre a pantalla completa.
  appleWebApp: { capable: true, title: "Hyrox" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
