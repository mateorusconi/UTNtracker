/**
 * ============================================================================
 *  TEMA — el único lugar donde se tocan los colores
 * ============================================================================
 *
 *  Dark mode first (§4.8). Las clases están escritas con el tema claro como
 *  base y el oscuro en `dark:`, que es la convención de Tailwind, pero el
 *  diseño se pensó para el oscuro.
 *
 *  Las tarjetas usan clases de Tailwind; las aristas del grafo son SVG y
 *  necesitan un color concreto, así que van aparte en `COLOR_ARISTA`.
 * ============================================================================
 */

import type { EstadoMateria, Habilitacion, Materia } from '../data/plan-utn-frt-isi-2023';

// ─────────────────────────────────────────────────────────────────────────────
// ACENTO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Color de acento de la carrera. La referencia usa ámbar para ingeniería.
 * Cambiá esto y cambian anillos de progreso, resaltados y selección.
 */
export const ACENTO = {
  nombre: 'naranja',
  hex: '#f97316', // orange-500
  texto: 'text-orange-600 dark:text-orange-400',
  fondo: 'bg-orange-500',
  fondoSuave: 'bg-orange-500/10',
  borde: 'border-orange-500/60',
  anillo: 'ring-orange-500',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// LOS 7 ESTADOS VISUALES DE LA TARJETA (§4.2)
// ─────────────────────────────────────────────────────────────────────────────

export type VarianteNodo =
  | 'aprobada'
  | 'cursando'
  | 'regular'
  | 'recursa'
  | 'disponible'
  | 'bloqueada';

export interface EstiloNodo {
  /** Clases del contenedor: borde + fondo + color de texto. */
  contenedor: string;
  /** Color del ícono y de la línea meta. */
  meta: string;
}

/**
 * Superficies **sólidas**, no velos translúcidos sobre el lienzo.
 *
 * Antes las tarjetas eran `bg-white/[0.03]` sobre un fondo casi negro: se leían
 * como manchas, no como objetos. La referencia usa un color de tarjeta propio
 * (un gris cálido) y deja que el color del estado viva en el **borde y el
 * ícono**, con apenas un tinte de fondo. Eso es lo que hace que el mapa se vea
 * ordenado en vez de un semáforo.
 */
export const ESTILO_NODO: Record<VarianteNodo, EstiloNodo> = {
  aprobada: {
    contenedor:
      'border-emerald-500/45 bg-emerald-50 text-emerald-950 shadow-sm dark:border-emerald-500/50 dark:bg-[#122019] dark:text-zinc-100',
    meta: 'text-emerald-700 dark:text-emerald-400/85',
  },
  cursando: {
    contenedor:
      'border-cyan-500/55 bg-cyan-50 text-cyan-950 shadow-[0_0_0_3px_rgba(34,211,238,.09)] dark:border-cyan-400/60 dark:bg-[#101d23] dark:text-zinc-100',
    meta: 'text-cyan-700 dark:text-cyan-300/85',
  },
  regular: {
    contenedor:
      'border-amber-500/45 bg-amber-50 text-amber-950 shadow-sm dark:border-amber-500/50 dark:bg-[#201a11] dark:text-zinc-100',
    meta: 'text-amber-700 dark:text-amber-400/85',
  },
  recursa: {
    contenedor:
      'border-red-500/45 bg-red-50 text-red-950 shadow-sm dark:border-red-500/50 dark:bg-[#201315] dark:text-zinc-100',
    meta: 'text-red-700 dark:text-red-400/85',
  },
  disponible: {
    contenedor:
      'border-zinc-300 bg-white text-zinc-900 shadow-sm dark:border-white/[0.12] dark:bg-[#1b1a1d] dark:text-zinc-100',
    meta: 'text-zinc-500 dark:text-zinc-400',
  },
  bloqueada: {
    contenedor:
      'border-zinc-200 bg-zinc-50/70 text-zinc-400 dark:border-white/[0.07] dark:bg-[#151417] dark:text-zinc-500',
    meta: 'text-zinc-400 dark:text-zinc-600',
  },
};

/** Overlay para electivas: borde punteado violeta (§4.2). */
export const ESTILO_ELECTIVA =
  'border-dashed border-violet-500/50 bg-violet-50/60 dark:border-violet-400/50 dark:bg-violet-950/20';

/** Overlay de la materia seleccionada: anillo punteado en el acento. */
export const ESTILO_SELECCIONADA = 'outline-2 outline-dashed outline-offset-2 outline-orange-500';

/**
 * Acento extra de las integradoras (16, 23, 30, 36 y Seminario Integrador):
 * una barrita vertical sobre el borde izquierdo. Son los cuellos de botella
 * reales del plan y merecen destacarse sin pelear con el ícono de estado.
 */
export const ESTILO_INTEGRADORA =
  'pointer-events-none absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-orange-500/75';

/**
 * Qué variante visual le toca a una materia.
 *
 * El estado que marcó el estudiante manda; la habilitación calculada solo
 * decide entre `disponible` y `bloqueada` para lo que todavía no arrancó.
 */
export function varianteDe(estado: EstadoMateria, habilitacion: Habilitacion): VarianteNodo {
  switch (estado) {
    case 'aprobada':
      return 'aprobada';
    case 'cursando':
      return 'cursando';
    case 'regular':
      return 'regular';
    case 'recursa':
      return 'recursa';
    case 'pendiente':
      return habilitacion === 'bloqueada' ? 'bloqueada' : 'disponible';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ARISTAS (§4.3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Color de la arista según el estado de la materia **origen**.
 *
 * Son hex concretos y no variables CSS porque React Flow los necesita también
 * para generar el `<marker>` de la punta de flecha.
 *
 * Desvío del prompt: para `pendiente` usamos zinc-500 en vez de neutral-700.
 * El neutral-700 desaparece sobre el fondo casi negro y pesa demasiado sobre
 * el blanco; el zinc-500 con baja opacidad recede parejo en los dos temas.
 */
export const COLOR_ARISTA: Record<EstadoMateria, string> = {
  aprobada: '#10b981', // emerald-500
  cursando: '#22d3ee', // cyan-400
  regular: '#f59e0b', // amber-500
  recursa: '#ef4444', // red-500
  pendiente: '#71717a', // zinc-500
};

/** Opacidad del trazo: lo pendiente recede, lo cursado se ve. */
export const OPACIDAD_ARISTA: Record<EstadoMateria, number> = {
  aprobada: 0.8,
  cursando: 0.8,
  regular: 0.75,
  recursa: 0.75,
  // Sobre el lienzo #141315 esto cae en ~#35343a, casi el mismo gris que usa
  // la referencia (#3e3e3e). Lo pendiente tiene que estar, no gritar.
  pendiente: 0.42,
};

/**
 * 1 px, como la referencia. Con 100+ aristas convergiendo en las mismas
 * tarjetas, medio píxel de más convierte el mapa en un plato de fideos.
 */
export const GROSOR_ARISTA = 1;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Concatena clases descartando las vacías. */
export function cx(...clases: readonly (string | false | null | undefined)[]): string {
  return clases.filter(Boolean).join(' ');
}

/** ¿Lleva el borde punteado violeta de electiva? */
export function esElectiva(materia: Materia): boolean {
  return materia.tipo === 'electiva';
}
