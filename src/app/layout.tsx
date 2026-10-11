import type { Metadata, Viewport } from "next";
import { Pixelify_Sans, Press_Start_2P, Silkscreen, VT323 } from "next/font/google";

import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
  display: "swap",
});

const silkscreen = Silkscreen({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-silkscreen",
  display: "swap",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
});

const pixelify = Pixelify_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-pixelify",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quote Quest: grab a ball, win a quote",
  description: "An 8-bit claw machine in five worlds. Steer the claw, grab a ball, crack it open and a real quote steps out on a retro game card.",
};

export const viewport: Viewport = {
  themeColor: "#b9a6f2",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${pressStart.variable} ${silkscreen.variable} ${vt323.variable} ${pixelify.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
