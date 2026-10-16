/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next trunca los cuerpos de request en 10 MB por defecto, lo que corrompe
  // los uploads multipart (video/imagen) y da 500. Subimos el límite a 100 MB
  // para que los route handlers de subida reciban el archivo completo.
  experimental: {
    proxyClientMaxBodySize: "100mb",
  },
  devIndicators: {
    hostname: false,
  },
  // Permite que el cliente HMR (127.0.0.1 / localhost) se conecte al
  // websocket de Turbopack sin ser bloqueado por la política de orígenes.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: false,
    // AVIF primero: el PNG de origen son 334 KB-918 KB y el PNG más pesado cae
    // por debajo de 200 KB servido en AVIF.
    formats: ["image/avif", "image/webp"],
    // 1920 es el peldaño que pide el hero a pantalla completa. El asset actual
    // (`tonfort-hero-wall.png`) es de 1024², así que por encima de 1024 el
    // optimizador sirve el original escalado: el fix real necesita el asset a
    // ≥1920 px de ancho.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gaqcbygvpwjuimewgqgu.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]
  },
}

export default nextConfig
