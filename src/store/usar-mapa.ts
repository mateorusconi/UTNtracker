'use client';

/**
 * Estado efímero del mapa: qué está seleccionado, qué capas de correlativas se
 * dibujan y si el panel lateral está abierto.
 *
 * **No se persiste** a propósito (§3 del prompt maestro): lo único que sobrevive
 * a un refresh es el avance.
 */

import { create } from 'zustand';

/** Qué capa de correlativas se dibuja. Por defecto solo *cursar* (§4.3). */
export interface CapasVisibles {
  cursar: boolean;
  rendir: boolean;
}

interface EstadoMapa {
  /** Slug de la materia seleccionada, o `null`. */
  seleccionada: string | null;
  capas: CapasVisibles;
  panelAbierto: boolean;
  railAbierto: boolean;
  /** Diálogo del catálogo de electivas. */
  electivasAbiertas: boolean;

  seleccionar: (slug: string | null) => void;
  alternarCapa: (capa: keyof CapasVisibles) => void;
  setPanelAbierto: (abierto: boolean) => void;
  alternarPanel: () => void;
  alternarRail: () => void;
  setElectivasAbiertas: (abiertas: boolean) => void;
}

export const usarMapa = create<EstadoMapa>()((set) => ({
  seleccionada: null,
  capas: { cursar: true, rendir: false },
  panelAbierto: true,
  railAbierto: true,
  electivasAbiertas: false,

  seleccionar: (slug) =>
    set((estado) => ({
      // Volver a clickear la misma materia deselecciona.
      seleccionada: estado.seleccionada === slug ? null : slug,
      panelAbierto: slug === null ? estado.panelAbierto : true,
    })),
  alternarCapa: (capa) =>
    set((estado) => ({ capas: { ...estado.capas, [capa]: !estado.capas[capa] } })),
  setPanelAbierto: (panelAbierto) => set({ panelAbierto }),
  alternarPanel: () => set((estado) => ({ panelAbierto: !estado.panelAbierto })),
  alternarRail: () => set((estado) => ({ railAbierto: !estado.railAbierto })),
  setElectivasAbiertas: (electivasAbiertas) => set({ electivasAbiertas }),
}));
