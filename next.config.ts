import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /** Export estático: el tracker no necesita servidor. Genera `out/`. */
  output: 'export',
  reactStrictMode: true,
  /** Sin optimizador de imágenes: no hay server que lo corra. */
  images: { unoptimized: true },
};

export default nextConfig;
