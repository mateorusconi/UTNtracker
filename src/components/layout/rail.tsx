'use client';

/**
 * Rail de íconos de la izquierda (§4.1), 64 px, grupos redondeados separados
 * por aire.
 *
 * Reducido a propósito respecto del prompt maestro: la app modela **un solo
 * plan**, así que no hay "carreras" ni "subir plan". Ver la sección Alcance
 * del README.
 */

import { BarChart3, Download, Home, Network, Search, type LucideIcon } from 'lucide-react';

import { cx } from '../../lib/theme';
import { usarMapa } from '../../store/usar-mapa';

interface ItemRail {
  icono: LucideIcon;
  etiqueta: string;
  activo?: boolean;
  onClick?: () => void;
  /** Todavía no implementado: llega en la fase indicada. */
  fase?: number;
}

export function Rail() {
  const abierto = usarMapa((estado) => estado.railAbierto);
  const panelAbierto = usarMapa((estado) => estado.panelAbierto);

  if (!abierto) return null;

  const grupos: readonly (readonly ItemRail[])[] = [
    [
      { icono: Home, etiqueta: 'Inicio', onClick: () => usarMapa.getState().seleccionar(null) },
      { icono: Download, etiqueta: 'Exportar progreso', fase: 4 },
    ],
    [
      { icono: Search, etiqueta: 'Buscar materia', fase: 4 },
      { icono: Network, etiqueta: 'Mapa', activo: true },
      {
        icono: BarChart3,
        etiqueta: 'Estadísticas',
        activo: panelAbierto,
        onClick: () => usarMapa.getState().alternarPanel(),
      },
    ],
  ];

  return (
    <nav
      className="flex w-16 shrink-0 flex-col items-center gap-3 border-r py-3"
      style={{ background: 'var(--barra)', borderColor: 'var(--border)' }}
      aria-label="Navegación principal"
    >
      {grupos.map((grupo, i) => (
        <div
          key={i}
          className="flex flex-col gap-1 rounded-xl p-1"
          style={{ background: 'var(--columna)' }}
        >
          {grupo.map(({ icono: Icono, etiqueta, activo, onClick, fase }) => (
            <button
              key={etiqueta}
              type="button"
              disabled={fase !== undefined}
              onClick={onClick}
              title={fase === undefined ? etiqueta : `${etiqueta} — llega en la Fase ${fase}`}
              className={cx(
                'grid size-10 place-items-center rounded-lg transition',
                activo === true
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                  : 'text-zinc-500 dark:text-zinc-400',
                fase === undefined
                  ? 'hover:bg-black/5 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-zinc-100'
                  : 'cursor-not-allowed opacity-35',
              )}
            >
              <Icono className="size-[18px]" />
              <span className="sr-only">{etiqueta}</span>
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
