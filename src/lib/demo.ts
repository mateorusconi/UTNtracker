/**
 * Avance de ejemplo — **andamio de la Fase 2**.
 *
 * El entregable de la fase es el mapa con todo en `pendiente`, pero así solo se
 * ven 2 de los 7 estados visuales. Este progreso de mentira los muestra todos
 * para poder revisarlos a ojo:
 *
 *   aprobada · cursando · regular con final habilitado ·
 *   regular con "falta final correlativo" · recursa · disponible · bloqueada
 *
 * La Fase 3 lo reemplaza por el store de Zustand con el avance real.
 */

import { progresoDesde } from './progreso';
import type { Progreso } from './tipos';

export const PROGRESO_DEMO: Progreso = progresoDesde({
  // Primer año entero aprobado.
  'isi-01': 'aprobada',
  'isi-02': 'aprobada',
  'isi-03': 'aprobada',
  'isi-04': 'aprobada',
  'isi-05': 'aprobada',
  'isi-06': 'aprobada',
  'isi-07': 'aprobada',
  'isi-08': 'aprobada',

  // Segundo año mezclado.
  'isi-09': 'regular', // final habilitado: 1 y 2 están aprobadas
  'isi-10': 'cursando',
  'isi-11': 'aprobada',
  'isi-12': 'recursa', // perdió la cursada de Inglés II
  'isi-13': 'regular',
  'isi-14': 'aprobada',
  'isi-15': 'cursando',
  // Aprobada y no regular a propósito: así el final de Sintaxis (13) queda como
  // el único que le falta a Bases de Datos (19), y la vista de próximos finales
  // tiene un "empezá por este" que mostrar.
  'isi-16': 'aprobada',

  // Tercero: Bases de Datos regular pero con 13 y 16 sin final →
  // "Falta final correlativo".
  'isi-17': 'cursando',
  'isi-19': 'regular',

  // Dos electivas de nivel 3, para que el contador de horas no arranque en
  // cero: 64 hs acreditadas de las 96 que exige el nivel, y 64 más en curso.
  'el-ux-productos': 'aprobada',
  'el-ux-ui': 'cursando',
});
