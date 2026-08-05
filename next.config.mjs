/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sin `typescript.ignoreBuildErrors`: como los push a main van directo a
  // producción (no hay Preview Deployments), un error de tipos debe romper el
  // build aquí y no aparecer como fallo en runtime frente al usuario.
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Evita que el navegador "adivine" tipos de contenido
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // El sitio no debe poder embeberse en iframes de terceros (clickjacking)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // No filtrar la URL completa a sitios externos
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // No usamos cámara/micrófono/geolocalización
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
