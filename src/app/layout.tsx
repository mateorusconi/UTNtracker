import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import '@xyflow/react/dist/style.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'UTrackerN — Tu carrera. Bajo control.',
  description:
    'Árbol de habilidades del plan 2023 de Ingeniería en Sistemas de Información de la UTN Facultad Regional Tucumán. Marcá tu avance y mirá qué se te desbloquea.',
  applicationName: 'UTrackerN',
};

export const viewport: Viewport = {
  themeColor: '#0c0b0d',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Dark mode first: la clase va en el HTML servido, así no hay parpadeo.
  return (
    <html lang="es-AR" className="dark">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
