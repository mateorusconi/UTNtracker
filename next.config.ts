import type { NextConfig } from 'next';

/**
 * En GitHub Pages el sitio no vive en la raíz del dominio sino en
 * `/UTNtracker`, así que todos los assets tienen que salir con ese prefijo. La
 * variable la setea el workflow de deploy; en `npm run dev` queda vacía y el
 * sitio corre en `/` como siempre.
 */
const basePath = process.env.PAGES_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  /** Export estático: el tracker no necesita servidor. Genera `out/`. */
  output: 'export',
  reactStrictMode: true,
  /** Sin optimizador de imágenes: no hay server que lo corra. */
  images: { unoptimized: true },

  ...(basePath === '' ? {} : { basePath, assetPrefix: basePath }),

  /**
   * Cada ruta se emite como `carpeta/index.html`. Sin esto, GitHub Pages
   * responde 404 al entrar directo a una URL que no sea la raíz.
   */
  trailingSlash: true,
};

export default nextConfig;
