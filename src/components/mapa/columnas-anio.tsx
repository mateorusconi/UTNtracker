'use client';

/**
 * Etiquetas de año y separadores de cuatrimestre.
 *
 * **No hay contenedor de año.** El §4.1 del prompt maestro pedía un panel
 * translúcido por nivel, pero React Flow dibuja las aristas *encima* de
 * cualquier cosa que pongamos detrás de los nodos, así que el panel quedaba
 * cruzado de líneas. La referencia (Carrear) no usa paneles: solo una etiqueta
 * de texto arriba de cada columna. Copiamos eso y el problema desaparece,
 * porque no queda superficie que cruzar.
 *
 * Van en un `<ViewportPortal>` con z-index negativo: son decoración, no se
 * seleccionan ni se arrastran.
 */

import { ViewportPortal } from '@xyflow/react';

import type { Layout } from '../../lib/layout';
import { ALTO_ETIQUETA_ANIO, ALTO_SEPARADOR } from '../../lib/layout';

export function ColumnasAnio({ layout }: { layout: Layout }) {
  return (
    <ViewportPortal>
      <div className="pointer-events-none absolute top-0 left-0" style={{ zIndex: -1 }}>
        {layout.columnas.map((columna) => (
          <div key={columna.nivel}>
            <header
              className="absolute flex items-center gap-2"
              style={{
                left: columna.x,
                top: columna.y,
                width: columna.ancho,
                height: ALTO_ETIQUETA_ANIO,
              }}
            >
              <span className="grid size-6 place-items-center rounded-md bg-orange-500/15 text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                {columna.nivel}
              </span>
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                {columna.etiqueta}
              </span>
              <span className="ml-auto text-[11px] text-zinc-400 dark:text-zinc-500">
                {columna.nodos.length}
              </span>
            </header>

            {columna.separadores.map((separador) => (
              <div
                key={separador.etiqueta}
                className="absolute flex items-center gap-2"
                style={{
                  left: columna.x,
                  top: separador.y,
                  width: columna.ancho,
                  height: ALTO_SEPARADOR,
                }}
              >
                <span className="h-px flex-1" style={{ background: 'var(--columna-borde)' }} />
                <span className="text-[10px] tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
                  {separador.etiqueta}
                </span>
                <span className="h-px flex-1" style={{ background: 'var(--columna-borde)' }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </ViewportPortal>
  );
}
