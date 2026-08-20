import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Playfair_Display, Great_Vibes } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { SITE_URL } from '@/lib/site'
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
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Somos Luz Iglesia | Iglesia Cristiana en Valparaíso',
    template: '%s | Somos Luz Iglesia',
  },
  // 152 caracteres a propósito: Google corta alrededor de 155. La versión
  // anterior tenía 179 y se cortaba a media frase, así que Google la
  // descartaba y armaba el resumen con texto del cuerpo — terminó usando la
  // descripción del ministerio juvenil, que hacía parecer que la iglesia era
  // solo para adolescentes. Esta entra completa y lleva lo que la gente busca:
  // dónde queda, a qué hora, y que hay espacio para todas las edades.
  description:
    'Iglesia cristiana en Valparaíso. Culto los domingos 11:30 hrs en Almirante Goñi 251, esquina Cochrane. Espacios para niños, jóvenes, hombres y mujeres.',
  keywords: [
    'iglesia', 'iglesia cristiana', 'iglesia en Valparaíso', 'iglesia evangélica Valparaíso',
    'Somos Luz', 'culto dominical', 'discipulado', 'jóvenes cristianos Valparaíso', 'congregación',
  ],
  applicationName: 'Somos Luz Iglesia',
  authors: [{ name: 'Somos Luz Iglesia' }],
  alternates: { canonical: '/' },
  generator: 'v0.app',
  openGraph: {
    title: 'Somos Luz Iglesia | Iglesia Cristiana en Valparaíso',
    description:
      'Una generación que manifiesta el Reino de Dios en la tierra. Culto general los domingos 11:30 hrs. Visítanos en Valparaíso, Chile.',
    url: '/',
    siteName: 'Somos Luz Iglesia',
    locale: 'es_CL',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Somos Luz Iglesia — Valparaíso, Chile' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Somos Luz Iglesia | Valparaíso',
    description: 'Una generación que manifiesta el Reino de Dios en la tierra.',
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  // Un solo diseño, no variantes por tema: Google indexa UN favicon por sitio
  // y las variantes light/dark solo multiplican los archivos que pueden
  // faltar. De hecho, los cuatro que se declaraban antes daban 404 y por eso
  // Google no mostraba el logo en los resultados.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.webmanifest',
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
