/**
 * Ayudas compartidas por los tests.
 *
 * Los tests hablan en **N° oficiales del Anexo I** (1 = Análisis Matemático I,
 * 19 = Bases de Datos, …) porque es el idioma de las ordenanzas y de los
 * criterios de aceptación. La traducción a `slug` la hacemos acá.
 */

import type { EstadoMateria, Materia } from '../src/data/plan-utn-frt-isi-2023';
import {
  construirGrafo,
  derivar,
  materiaDe,
  type Grafo,
  type MateriaDerivada,
} from '../src/lib/grafo';
import type { Progreso } from '../src/lib/tipos';

export const grafo: Grafo = construirGrafo();

/** N° oficial → materia. Tira si el id no existe: sería un bug del test. */
export function materia(id: number): Materia {
  const m = grafo.porId.get(id);
  if (m === undefined) throw new Error(`No existe la materia con id ${id}`);
  return m;
}

/** N° oficial → slug. */
export function slug(id: number): string {
  return materia(id).slug;
}

/** `[desde..hasta]` inclusive. `rango(1, 35)` → todas las previas a Proyecto Final. */
export function rango(desde: number, hasta: number): number[] {
  return Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
}

/**
 * Arma un `Progreso` desde N° oficiales.
 * @example estados({ 1: 'regular', 2: 'aprobada' })
 */
export function estados(porId: Readonly<Record<number, EstadoMateria>>): Progreso {
  const salida: Record<string, { estado: EstadoMateria }> = {};
  for (const [id, estado] of Object.entries(porId)) {
    salida[slug(Number(id))] = { estado };
  }
  return salida;
}

/** Atajo: todas esas materias con el final aprobado. */
export function aprobadas(...ids: readonly number[]): Progreso {
  const salida: Record<string, { estado: EstadoMateria }> = {};
  for (const id of ids) salida[slug(id)] = { estado: 'aprobada' };
  return salida;
}

/** Atajo: todas esas materias con la cursada aprobada y el final pendiente. */
export function regulares(...ids: readonly number[]): Progreso {
  const salida: Record<string, { estado: EstadoMateria }> = {};
  for (const id of ids) salida[slug(id)] = { estado: 'regular' };
  return salida;
}

/** Une varios progresos. El último pisa al anterior. */
export function combinar(...partes: readonly Progreso[]): Progreso {
  return Object.assign({}, ...partes) as Progreso;
}

/** Estado derivado de una materia, buscándola por N° oficial. */
export function derivadaPorId(id: number, progreso: Progreso): MateriaDerivada {
  return derivar(materia(id), progreso, grafo);
}

/** Estado derivado de una materia, buscándola por slug (para las electivas). */
export function derivadaPorSlug(slugMateria: string, progreso: Progreso): MateriaDerivada {
  return derivar(materiaDe(grafo, slugMateria), progreso, grafo);
}
