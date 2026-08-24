'use client';

/** Anillo de progreso (donut SVG) del panel de estadísticas (§4.4). */

import type { ReactNode } from 'react';

interface Props {
  /** 0–100. */
  porcentaje: number;
  tamano?: number;
  grosor?: number;
  /** Color del arco. Por defecto, el acento. */
  color?: string;
  children?: ReactNode;
}

export function Anillo({
  porcentaje,
  tamano = 104,
  grosor = 9,
  color = 'var(--primary)',
  children,
}: Props) {
  const radio = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const avance = Math.max(0, Math.min(100, porcentaje));
  const centro = tamano / 2;

  return (
    <div className="relative shrink-0" style={{ width: tamano, height: tamano }}>
      <svg
        width={tamano}
        height={tamano}
        viewBox={`0 0 ${tamano} ${tamano}`}
        // Arrancamos el arco arriba, no a las 3 en punto.
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden
      >
        <circle
          cx={centro}
          cy={centro}
          r={radio}
          fill="none"
          stroke="var(--border)"
          strokeWidth={grosor}
        />
        <circle
          cx={centro}
          cy={centro}
          r={radio}
          fill="none"
          stroke={color}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - avance / 100)}
          style={{ transition: 'stroke-dashoffset .4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
