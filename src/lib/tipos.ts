/**
 * Tipos del avance del estudiante.
 *
 * Regla de oro (§3 del prompt maestro): lo ÚNICO que se persiste es el
 * `Progreso`, un `Record<slug, RegistroProgreso>`. Todo lo demás
 * —habilitaciones, estadísticas, aristas resaltadas— es derivado y se
 * recalcula. Si guardáramos estado derivado, el día que se actualice el plan
 * los datos viejos mentirían.
 */

import type { EstadoMateria } from '../data/plan-utn-frt-isi-2023';

/** Lo que el estudiante marcó sobre UNA materia. */
export interface RegistroProgreso {
  estado: EstadoMateria;
  /** Nota del final (0–10). Opcional, solo informativa. */
  nota?: number;
  /** Fecha del último cambio, en ISO 8601 (`2026-08-22`). */
  fecha?: string;
}

/**
 * Avance completo, indexado por `slug`.
 *
 * Una materia **ausente del record equivale a `pendiente`**. Nunca guardamos
 * las 53 materias con estado `pendiente`: el localStorage arranca en `{}`.
 */
export type Progreso = Readonly<Record<string, RegistroProgreso>>;

/** Estado por defecto de toda materia que no figure en el `Progreso`. */
export const ESTADO_POR_DEFECTO: EstadoMateria = 'pendiente';
