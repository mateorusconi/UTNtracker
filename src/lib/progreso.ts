/**
 * Primitivas puras sobre el `Progreso`.
 *
 * Nada de esto conoce el grafo ni React: son funciones sobre un `Record`.
 * En la Fase 3 el store de Zustand las va a usar tal cual para sus acciones.
 */

import type { EstadoMateria } from '../data/plan-utn-frt-isi-2023';
import { ESTADO_POR_DEFECTO, type Progreso, type RegistroProgreso } from './tipos';

/** Progreso de un estudiante que recién arranca: todo pendiente. */
export const PROGRESO_VACIO: Progreso = Object.freeze({});

/** Estados que cuentan como "cursada aprobada" a la hora de correlativas. */
const ESTADOS_REGULARIZADOS: ReadonlySet<EstadoMateria> = new Set<EstadoMateria>([
  'regular',
  'aprobada',
]);

/**
 * Estado de una materia. Si no está en el record, es `pendiente`.
 *
 * @example estadoDe(progreso, 'isi-19') // 'regular'
 */
export function estadoDe(progreso: Progreso, slug: string): EstadoMateria {
  return progreso[slug]?.estado ?? ESTADO_POR_DEFECTO;
}

/**
 * ¿La materia tiene la **cursada** aprobada?
 * Verdadero para `regular` y `aprobada`. `cursando` NO cuenta: todavía no la
 * regularizó. `recursa` tampoco: perdió la cursada.
 */
export function estaRegularizada(progreso: Progreso, slug: string): boolean {
  return ESTADOS_REGULARIZADOS.has(estadoDe(progreso, slug));
}

/** ¿La materia tiene el **final** aprobado? */
export function estaAprobada(progreso: Progreso, slug: string): boolean {
  return estadoDe(progreso, slug) === 'aprobada';
}

/**
 * Devuelve un `Progreso` nuevo con la materia en el estado pedido.
 * Inmutable: no toca el original (importante para el `undo` de la Fase 3).
 *
 * Marcar como `pendiente` **borra** la entrada, para que el record no crezca
 * con basura y el JSON exportado quede mínimo.
 */
export function marcar(
  progreso: Progreso,
  slug: string,
  estado: EstadoMateria,
  extra?: Omit<RegistroProgreso, 'estado'>,
): Progreso {
  if (estado === ESTADO_POR_DEFECTO && extra === undefined) {
    return desmarcar(progreso, slug);
  }
  return { ...progreso, [slug]: { estado, ...extra } };
}

/** Saca la materia del record (vuelve a `pendiente`). */
export function desmarcar(progreso: Progreso, slug: string): Progreso {
  if (!(slug in progreso)) return progreso;
  const copia: Record<string, RegistroProgreso> = { ...progreso };
  delete copia[slug];
  return copia;
}

/**
 * Atajo para armar un `Progreso` desde un objeto plano.
 * Pensado para tests y para el import de JSON de la Fase 4.
 *
 * @example progresoDesde({ 'isi-01': 'aprobada', 'isi-02': 'regular' })
 */
export function progresoDesde(entradas: Readonly<Record<string, EstadoMateria>>): Progreso {
  const salida: Record<string, RegistroProgreso> = {};
  for (const [slug, estado] of Object.entries(entradas)) {
    if (estado === ESTADO_POR_DEFECTO) continue;
    salida[slug] = { estado };
  }
  return salida;
}

/** Cantidad de materias efectivamente marcadas (útil para el "¿hay algo que exportar?"). */
export function cantidadMarcadas(progreso: Progreso): number {
  return Object.keys(progreso).length;
}
