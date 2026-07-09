import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Playfair_Display, Great_Vibes } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });
// Script manuscrita — hermana tipográfica del wordmark del logo
const greatVibes = Great_Vibes({ subsets: ['latin'], weight: '400', variable: '--font-script' });

// Barra del navegador móvil en crema de marca (guía: theme-color acorde al fondo)
export const viewport: Viewport = {
  themeColor: '#f6f2e8',
}

export const metadata: Metadata = {
  title: 'Somos Luz Iglesia',
  description:
    'Iglesia Cristiana Somos Luz en Valparaíso, Chile. Una generación que manifiesta el Reino de Dios en la tierra. Culto general los domingos 11:30 hrs.',
  generator: 'v0.app',
  openGraph: {
    title: 'Somos Luz Iglesia',
    description:
      'Una generación que manifiesta el Reino de Dios en la tierra. Visítanos en Valparaíso, Chile.',
    locale: 'es_CL',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Somos Luz Iglesia — Valparaíso, Chile' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og.png'],
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${playfair.variable} ${greatVibes.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="top-center" />
        <Analytics />
      </body>
    </html>
  )
}
