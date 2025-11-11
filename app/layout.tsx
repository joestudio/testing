import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Explode.it - Extract Images, Colors & Fonts",
  description: "Extract images, color palettes, and fonts from any webpage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
