/**
 * ============================================================================
 *  RESPALDO DEL AVANCE — exportar e importar
 * ============================================================================
 *
 *  El avance vive en el `localStorage` del navegador: no hay cuentas ni
 *  servidor. Eso significa que si cambiás de dispositivo, borrás los datos del
 *  navegador o entrás en incógnito, se pierde. Estas funciones son la salida:
 *  un JSON que te bajás y volvés a cargar donde quieras.
 *
 *  El archivo que entra es **dato ajeno**, no código nuestro: puede estar
 *  corrupto, ser de otra app, tener slugs de una versión vieja del plan o
 *  estados inventados. Por eso `leerRespaldo` valida entrada por entrada y
 *  devuelve qué ignoró, en vez de confiar y romper.
 * ============================================================================
 */

import type { EstadoMateria } from '../data/plan-utn-frt-isi-2023';
import type { Grafo } from './grafo';
import type { Progreso, RegistroProgreso } from './tipos';

export const VERSION_RESPALDO = 1;
export const NOMBRE_APP = 'UTrackerN';

export interface Respaldo {
  app: string;
  /** Id del plan, para no mezclar avances de carreras distintas. */
  plan: string;
  version: number;
  /** ISO 8601. Solo informativo. */
  exportado: string;
  progreso: Progreso;
}

const ESTADOS_VALIDOS: ReadonlySet<string> = new Set<EstadoMateria>([
  'pendiente',
  'cursando',
  'regular',
  'aprobada',
  'recursa',
]);

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTAR
// ─────────────────────────────────────────────────────────────────────────────

export function crearRespaldo(progreso: Progreso, grafo: Grafo, ahora: Date): Respaldo {
  return {
    app: NOMBRE_APP,
    plan: grafo.plan.id,
    version: VERSION_RESPALDO,
    exportado: ahora.toISOString(),
    progreso,
  };
}

/** `utrackern-2026-08-25.json` */
export function nombreDeArchivo(ahora: Date): string {
  const dia = [
    ahora.getFullYear(),
    String(ahora.getMonth() + 1).padStart(2, '0'),
    String(ahora.getDate()).padStart(2, '0'),
  ].join('-');
  return `utrackern-${dia}.json`;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTAR
// ─────────────────────────────────────────────────────────────────────────────

export interface ImportacionOk {
  ok: true;
  progreso: Progreso;
  /** Cuántas materias se pudieron leer. */
  importadas: number;
  /** Claves que se descartaron, con el motivo. */
  ignoradas: string[];
  /** Ej.: el archivo es de otro plan. No impide importar, pero conviene decirlo. */
  aviso: string | null;
}

export interface ImportacionError {
  ok: false;
  error: string;
}

export type ResultadoImportacion = ImportacionOk | ImportacionError;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/**
 * Lee y valida un archivo de respaldo.
 *
 * Nunca tira: cualquier problema vuelve como `{ ok: false, error }` con un
 * mensaje que se le pueda mostrar a una persona. Las entradas que no entiende
 * las descarta y las reporta, en lugar de abortar toda la importación por una
 * materia que ya no existe en el plan.
 */
export function leerRespaldo(texto: string, grafo: Grafo): ResultadoImportacion {
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' };
  }

  if (!esObjeto(crudo)) {
    return { ok: false, error: 'El archivo no tiene el formato esperado.' };
  }

  // Aceptamos tanto el respaldo completo como un `Progreso` pelado: si alguien
  // copia y pega solo esa parte, que funcione igual.
  const posible = crudo['progreso'];
  const bruto = esObjeto(posible) ? posible : crudo;

  if (!esObjeto(bruto)) {
    return { ok: false, error: 'No encontré el avance dentro del archivo.' };
  }

  const progreso: Record<string, RegistroProgreso> = {};
  const ignoradas: string[] = [];

  for (const [slug, valor] of Object.entries(bruto)) {
    const materia = grafo.porSlug.get(slug);
    if (materia === undefined) {
      ignoradas.push(`${slug} (no existe en el plan)`);
      continue;
    }
    if (!esObjeto(valor)) {
      ignoradas.push(`${slug} (formato inesperado)`);
      continue;
    }
    const estado = valor['estado'];
    if (typeof estado !== 'string' || !ESTADOS_VALIDOS.has(estado)) {
      ignoradas.push(`${slug} (estado desconocido)`);
      continue;
    }
    if (estado === 'pendiente') continue; // el default no se guarda

    const registro: RegistroProgreso = { estado: estado as EstadoMateria };
    const nota = valor['nota'];
    if (typeof nota === 'number' && Number.isFinite(nota)) registro.nota = nota;
    const fecha = valor['fecha'];
    if (typeof fecha === 'string') registro.fecha = fecha;

    progreso[slug] = registro;
  }

  const importadas = Object.keys(progreso).length;
  if (importadas === 0) {
    return {
      ok: false,
      error:
        ignoradas.length > 0
          ? 'El archivo no tiene ninguna materia que este plan reconozca.'
          : 'El archivo no tiene ningún avance cargado.',
    };
  }

  const planDelArchivo = crudo['plan'];
  const aviso =
    typeof planDelArchivo === 'string' && planDelArchivo !== grafo.plan.id
      ? `El archivo dice ser del plan "${planDelArchivo}" y este tracker es de "${grafo.plan.id}".`
      : null;

  return { ok: true, progreso, importadas, ignoradas, aviso };
}
