'use client';

/**
 * ============================================================================
 *  STORE DEL AVANCE — lo único que se persiste
 * ============================================================================
 *
 *  Guarda `Record<slug, { estado, nota?, fecha? }>` y nada más. Habilitaciones,
 *  estadísticas y resaltados se recalculan con las funciones puras de
 *  `lib/grafo.ts`. Si guardáramos estado derivado, el día que se actualice el
 *  plan los datos viejos mentirían.
 * ============================================================================
 */

import { useEffect } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { EstadoMateria } from '../data/plan-utn-frt-isi-2023';
import { marcar } from '../lib/progreso';
import type { Progreso } from '../lib/tipos';

export const CLAVE_PERSISTENCIA = 'utrackern:v1';

/**
 * El proyecto se llamaba "Trackea UTN" y guardaba con esta clave. Renombrar sin
 * más habría dejado huérfano el avance de cualquiera que ya venía usando la
 * app, así que la primera vez lo copiamos a la clave nueva.
 */
const CLAVE_ANTERIOR = 'trackea-utn:v1';

interface EstadoProgreso {
  progreso: Progreso;
  /** Cambia el estado de UNA materia. Inmutable: devuelve un record nuevo. */
  marcarMateria: (slug: string, estado: EstadoMateria) => void;
  /** Pisa todo el avance. Lo usa el "Deshacer" de una carga masiva y, en la Fase 4, el import de JSON. */
  reemplazar: (progreso: Progreso) => void;
  reiniciar: () => void;
}

export const usarProgreso = create<EstadoProgreso>()(
  persist(
    (set) => ({
      progreso: {},
      marcarMateria: (slug, estado) =>
        set((estadoActual) => ({ progreso: marcar(estadoActual.progreso, slug, estado) })),
      reemplazar: (progreso) => set({ progreso }),
      reiniciar: () => set({ progreso: {} }),
    }),
    {
      name: CLAVE_PERSISTENCIA,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Solo el avance. Las capas y el panel se resetean en cada sesión.
      partialize: (estado) => ({ progreso: estado.progreso }),
      /**
       * La página es un export estático prerenderizado con el avance vacío. Si
       * el store se hidratara solo, el primer render del cliente no coincidiría
       * con el HTML servido y React tiraría un error de hidratación. Por eso
       * rehidratamos a mano después de montar.
       */
      skipHydration: true,
    },
  ),
);

/** Levanta el avance del localStorage una vez montado el árbol de React. */
export function useHidratarProgreso(): void {
  useEffect(() => {
    migrarClaveVieja();
    void usarProgreso.persist.rehydrate();
  }, []);
}

/** Copia el avance guardado con el nombre viejo del proyecto, una sola vez. */
function migrarClaveVieja(): void {
  try {
    if (localStorage.getItem(CLAVE_PERSISTENCIA) !== null) return;
    const guardado = localStorage.getItem(CLAVE_ANTERIOR);
    if (guardado === null) return;
    localStorage.setItem(CLAVE_PERSISTENCIA, guardado);
  } catch {
    // localStorage bloqueado (modo privado, permisos): no es fatal, se arranca vacío.
  }
}
