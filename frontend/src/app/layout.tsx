import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blaind — Vizualni Interpretator",
  description: "Univerzalni vizualni interpretator za slijepe osobe",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr">
      <body>{children}</body>
    </html>
  );
}
