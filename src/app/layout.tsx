import type { Metadata, Viewport } from "next"
import { Roboto, JetBrains_Mono } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

const sans = Roboto({
  variable: "--font-sans-loaded",
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
})

const mono = JetBrains_Mono({
  variable: "--font-mono-loaded",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Kimeku — Field Manual",
  description: "Documentación de procesos para áreas tech",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Kimeku",
    statusBarStyle: "black-translucent",
  },
}

export const viewport: Viewport = {
  themeColor: "#0c1226",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg text-fg font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
