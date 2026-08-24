/**
 * Textos que ve el usuario en la tarjeta de materia (§4.2).
 *
 * La **línea meta** es el N° oficial + un sufijo que cambia según el momento:
 * `19 · Falta final correlativo`, `30 · Integradora`, `3° · Optativa`.
 * Está acá y no en el componente para poder testearla sin renderizar nada.
 */

import type { Materia, Regimen } from '../data/plan-utn-frt-isi-2023';
import { esDeIngenieria, type MateriaDerivada, type Resaltado } from './grafo';

/** Qué relación tiene la materia con la que está seleccionada en el canvas. */
export type ContextoSeleccion = 'ninguno' | 'seleccionada' | 'requisito' | 'descendiente';

/** Ubica una materia dentro del subgrafo resaltado. */
export function contextoDe(slug: string, resaltado: Resaltado | null): ContextoSeleccion {
  if (resaltado === null) return 'ninguno';
  if (resaltado.seleccionada === slug) return 'seleccionada';
  if (resaltado.requisitos.has(slug)) return 'requisito';
  if (resaltado.desbloquea.has(slug)) return 'descendiente';
  return 'ninguno';
}

/**
 * Número que se muestra a la izquierda de la línea meta.
 * Las electivas comparten `id: 0`, así que muestran el nivel: `3°`.
 */
export function numeroVisible(materia: Materia): string {
  return materia.tipo === 'electiva' ? `${materia.nivel}°` : String(materia.id);
}

/**
 * Sufijo contextual de la línea meta. `null` si no hay nada que decir.
 *
 * El orden importa: primero lo que depende de la selección actual, después lo
 * que es urgente para el estudiante, y al final lo que describe a la materia.
 */
export function sufijoMeta(
  derivada: MateriaDerivada,
  contexto: ContextoSeleccion = 'ninguno',
): string | null {
  const { materia } = derivada;

  // 1. Relación con el nodo seleccionado.
  if (contexto === 'seleccionada') return 'Seleccionada';
  if (contexto === 'requisito') return 'Requisito';
  if (contexto === 'descendiente') return 'Desbloquea materia';

  // 2. Lo que le conviene saber ya.
  if (derivada.faltaFinalCorrelativo) return 'Falta final correlativo';
  if (derivada.habilitacion === 'final-habilitado') return 'Final habilitado';
  if (derivada.inconsistente) return 'Revisar correlativas';

  // 3. Qué clase de materia es.
  if (materia.tipo === 'electiva') return 'Optativa';
  if (materia.tipo === 'practica') return `Práctica · ${materia.horasTotales} hs`;
  if (!esDeIngenieria(materia)) return 'Título intermedio';
  if (materia.integradora === true) return 'Integradora';

  return null;
}

/**
 * En qué cuatrimestre se dicta. Versión corta para el tag de la tarjeta.
 *
 * En el Plan 2023 las 36 obligatorias son **todas anuales**; el dato solo varía
 * en las electivas, que son cuatrimestrales.
 */
export const TAG_REGIMEN: Record<Regimen, string> = {
  anual: 'Anual',
  'cuatrimestral-1': '1° cuat.',
  'cuatrimestral-2': '2° cuat.',
  'cuatrimestral-1y2': '1° y 2° cuat.',
  'sin-publicar': 'Dictado sin publicar',
};

/** Versión larga, para tooltips. */
export const NOMBRE_REGIMEN: Record<Regimen, string> = {
  anual: 'Anual',
  'cuatrimestral-1': 'Se dicta en el 1° cuatrimestre',
  'cuatrimestral-2': 'Se dicta en el 2° cuatrimestre',
  'cuatrimestral-1y2': 'Se dicta en el 1° y en el 2° cuatrimestre',
  'sin-publicar': 'El Departamento no publica en qué cuatrimestre se dicta',
};

/** Nombre legible del estado, para tooltips y menús. */
export const NOMBRE_ESTADO = {
  pendiente: 'Pendiente',
  cursando: 'Cursando',
  regular: 'Regular (adeuda final)',
  aprobada: 'Aprobada',
  recursa: 'Recursa',
} as const;

/** Texto del `title` de la tarjeta: nombre + estado + horas. */
export function tooltipMateria(derivada: MateriaDerivada): string {
  const { materia, estado } = derivada;
  const partes = [
    `${numeroVisible(materia)} · ${materia.nombre}`,
    NOMBRE_ESTADO[estado],
    TAG_REGIMEN[materia.regimen],
    `${materia.horasTotales} hs`,
  ];
  if (materia.requiereVerificacion === true) partes.push('⚠ dato a verificar');
  return partes.join(' — ');
}
