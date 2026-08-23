import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StackBox",
  // States what the product does. §22.2 rules out the "all-in-one platform"
  // register this slot usually attracts.
  description: "Write documents, draw on an infinite canvas, and run code in one workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      {/*
       * `h-full`, not `min-h-full`: the Canvas surface (tldraw) sizes itself
       * with `height: 100%` down a chain of `flex-1` ancestors, and a
       * percentage height only resolves against a *definite* containing-block
       * height. `min-height` sets a floor but leaves the specified height
       * `auto`, which the flexbox spec treats as indefinite for every
       * `flex-1` descendant's height — even though each one still renders at
       * the correct pixel size via flex-grow. `height: 100%` here (anchored
       * to `html`'s `h-full`, which is genuinely definite against the
       * viewport) is what makes the whole chain definite so tldraw's
       * percentage sizing actually resolves instead of collapsing to 0.
       */}
      <body className="h-full flex flex-col">{children}</body>
    </html>
  );
}
