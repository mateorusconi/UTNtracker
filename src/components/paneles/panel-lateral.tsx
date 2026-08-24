'use client';

/**
 * Panel flotante de la derecha (§4.4 y §4.5).
 *
 * Muestra las estadísticas generales, y cuando hay una materia seleccionada la
 * reemplaza por el detalle de esa materia.
 */

import { ChevronDown, X } from 'lucide-react';

import PLAN from '../../data/plan-utn-frt-isi-2023';
import { cx } from '../../lib/theme';
import { usarMapa } from '../../store/usar-mapa';
import { PanelEstadisticas } from './estadisticas';
import { PanelSeleccion } from './seleccion';

export function PanelLateral() {
  const seleccionada = usarMapa((estado) => estado.seleccionada);
  const abierto = usarMapa((estado) => estado.panelAbierto);

  return (
    <aside
      className="absolute top-4 right-4 z-10 flex max-h-[calc(100%-2rem)] w-90 flex-col overflow-hidden rounded-2xl border backdrop-blur-md"
      style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
    >
      <header className="flex shrink-0 items-center gap-2 px-4 py-3">
        <h2 className="text-sm font-semibold">
          {seleccionada === null ? 'Estadísticas' : 'Materia'}
        </h2>
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">#{PLAN.plan}</span>

        {seleccionada !== null && (
          <button
            type="button"
            onClick={() => usarMapa.getState().seleccionar(null)}
            title="Volver a las estadísticas (Esc)"
            className="ml-auto grid size-7 place-items-center rounded-md text-zinc-500 transition hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10"
          >
            <X className="size-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => usarMapa.getState().alternarPanel()}
          title={abierto ? 'Colapsar panel' : 'Expandir panel'}
          aria-expanded={abierto}
          className={cx(
            'grid size-7 place-items-center rounded-md text-zinc-500 transition hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10',
            seleccionada === null && 'ml-auto',
          )}
        >
          <ChevronDown className={cx('size-4 transition-transform', !abierto && '-rotate-90')} />
        </button>
      </header>

      {abierto && (
        <div
          className="min-h-0 flex-1 overflow-y-auto border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          {seleccionada === null ? <PanelEstadisticas /> : <PanelSeleccion slug={seleccionada} />}
        </div>
      )}
    </aside>
  );
}
