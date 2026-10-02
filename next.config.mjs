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
