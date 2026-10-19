import React from "react"
import type { Metadata } from 'next'
import { Arvo, Montserrat } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { SmoothScrollProvider } from '@/components/tonfort/smooth-scroll-provider'
import './globals.css'

const arvo = Arvo({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: '--font-arvo'
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: '--font-montserrat'
});

// `app/sitemap.ts` resuelve el mismo dominio. Con `metadataBase` las URLs
// relativas de Open Graph (p. ej. `/sede/hero-sede.png`) se resuelven contra el
// dominio canónico en lugar del origen del build.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tonfort.co"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Tonfort — Diseño de espacios y mobiliario a medida',
  description: 'No diseñamos muebles, diseñamos espacios. Cocinas, closets, muebles de TV y puertas a medida con soluciones de iluminación integradas. Vendemos la experiencia de habitar un espacio.',
  icons: {
    icon: '/icon-light-32x32.png',
    apple: '/apple-icon.png',
    other: [
      { rel: 'icon', type: 'image/png', sizes: '32x32', url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="bg-background" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${arvo.variable} ${montserrat.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SmoothScrollProvider>
            {children}
          </SmoothScrollProvider>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}