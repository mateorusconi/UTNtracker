/**
 * ============================================================================
 *  LAYOUT DETERMINÍSTICO DEL MAPA
 * ============================================================================
 *
 *  Nada de dagre ni de layouts automáticos: el plan es fijo y queremos columnas
 *  prolijas y **estables**. Misma entrada → mismas coordenadas, siempre. Si el
 *  mapa se reacomodara solo, el estudiante perdería la referencia espacial que
 *  construyó de tanto mirarlo.
 *
 *      x = (nivel - 1) × (ANCHO_COLUMNA + GAP_COLUMNAS)
 *      y = orden dentro del nivel, respetando el corte de cuatrimestre
 *
 *  Función pura: no sabe nada de React Flow. La capa de React la traduce a
 *  nodos.
 * ============================================================================
 */

import type { Materia, Regimen } from '../data/plan-utn-frt-isi-2023';

// ─────────────────────────────────────────────────────────────────────────────
// MEDIDAS (§4.1 y §4.2 del prompt maestro)
// ─────────────────────────────────────────────────────────────────────────────

/** Ancho de la tarjeta de materia. */
export const ANCHO_NODO = 250;
/**
 * Alto fijo: línea meta + nombre en hasta dos renglones + padding.
 * 74 y no 68: con 68 los nombres largos de dos líneas se comen el descendente
 * de la última letra ("Sintaxis y Semántica de los Lenguajes").
 */
export const ALTO_NODO = 74;

/**
 * Aire entre columnas y entre tarjetas.
 *
 * Generoso a propósito. La referencia usa tarjetas de 51 px con un paso
 * vertical de 130 —dos veces y media el alto de la tarjeta— y 180 px entre
 * columnas. Con 38 materias y 100+ aristas, el aire es lo único que evita que
 * el mapa se lea como un plato de fideos.
 */
export const GAP_COLUMNAS = 150;
export const PASO_COLUMNA = ANCHO_NODO + GAP_COLUMNAS;
export const GAP_NODOS = 26;
export const PASO_NODO = ALTO_NODO + GAP_NODOS;

/** Aire arriba de la primera tarjeta, donde va la etiqueta `1° Año`. */
export const ALTO_ETIQUETA_ANIO = 44;
/** Banda del separador `2° Cuatrimestre`. */
export const ALTO_SEPARADOR = 36;

/**
 * Padding del `fitView`, como fracción del viewport.
 *
 * Es simétrico a propósito: el panel flotante de la derecha tapa parte de la
 * última columna, y está bien — el canvas se panea. Reservarle el ancho al
 * panel achicaría el mapa entero para ganar poco.
 */
export const PADDING_ENCUADRE = 0.12;

export type Nivel = 1 | 2 | 3 | 4 | 5;

export const NIVELES: readonly Nivel[] = [1, 2, 3, 4, 5];

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface NodoPosicionado {
  materia: Materia;
  x: number;
  y: number;
}

export interface SeparadorCuatrimestre {
  /** Y relativo al origen del layout, igual que los nodos. */
  y: number;
  etiqueta: string;
}

export interface ColumnaAnio {
  nivel: Nivel;
  /** `1° Año` */
  etiqueta: string;
  x: number;
  y: number;
  ancho: number;
  /** Alto según contenido: cada columna termina donde termina su última tarjeta. */
  alto: number;
  nodos: NodoPosicionado[];
  separadores: SeparadorCuatrimestre[];
}

/**
 * Ojo: **no hay contenedor de año**. El §4.1 del prompt maestro pedía un panel
 * translúcido por nivel, pero con las aristas dibujándose por encima quedaba
 * cruzado de líneas. La referencia (Carrear) no usa paneles: solo una etiqueta
 * de texto arriba de cada columna. Copiamos eso — el problema desaparece porque
 * no hay superficie que cruzar.
 */

export interface Layout {
  columnas: ColumnaAnio[];
  /** Bounding box completo, útil para el `fitView` y para tests. */
  ancho: number;
  alto: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDEN DENTRO DE LA COLUMNA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A qué mitad del año pertenece la materia.
 *
 * Las anuales y las del 1° cuatrimestre arrancan arriba; solo las exclusivas
 * del 2° cuatrimestre bajan y disparan el separador.
 *
 * Ojo: en el Plan 2023 **todas las obligatorias son anuales**, así que hoy el
 * separador no se dibuja nunca en el mapa de la carrera. Está implementado
 * igual porque las electivas sí son cuatrimestrales (Fase 4).
 */
export function grupoCuatrimestre(regimen: Regimen): 1 | 2 {
  return regimen === 'cuatrimestral-2' ? 2 : 1;
}

/** Orden del Anexo I: primero el cuatrimestre, después el N° oficial. */
function compararMaterias(a: Materia, b: Materia): number {
  const grupo = grupoCuatrimestre(a.regimen) - grupoCuatrimestre(b.regimen);
  return grupo !== 0 ? grupo : a.id - b.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// CÁLCULO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Coloca cada materia en su columna de año.
 *
 * @param materias Las del plan. Las electivas no van al mapa principal: tienen
 *                 su propia vista (§4.4, botón `Ver electivas`).
 */
export function calcularLayout(materias: readonly Materia[]): Layout {
  const columnas: ColumnaAnio[] = [];
  let altoMaximo = 0;

  for (const nivel of NIVELES) {
    const delNivel = materias.filter((m) => m.nivel === nivel).sort(compararMaterias);
    const x = (nivel - 1) * PASO_COLUMNA;

    const nodos: NodoPosicionado[] = [];
    const separadores: SeparadorCuatrimestre[] = [];

    let cursorY = ALTO_ETIQUETA_ANIO;
    let grupoAnterior: 1 | 2 | null = null;

    for (const materia of delNivel) {
      const grupo = grupoCuatrimestre(materia.regimen);
      if (grupoAnterior !== null && grupo !== grupoAnterior) {
        separadores.push({ y: cursorY, etiqueta: `${grupo}° Cuatrimestre` });
        cursorY += ALTO_SEPARADOR;
      }
      grupoAnterior = grupo;

      nodos.push({ materia, x, y: cursorY });
      cursorY += PASO_NODO;
    }

    const alto = nodos.length === 0 ? ALTO_ETIQUETA_ANIO : cursorY - GAP_NODOS;

    columnas.push({
      nivel,
      etiqueta: `${nivel}° Año`,
      x,
      y: 0,
      ancho: ANCHO_NODO,
      alto,
      nodos,
      separadores,
    });
    altoMaximo = Math.max(altoMaximo, alto);
  }

  return {
    columnas,
    ancho: (NIVELES.length - 1) * PASO_COLUMNA + ANCHO_NODO,
    alto: altoMaximo,
  };
}

/** Todas las materias posicionadas, aplanadas. Atajo para armar los nodos. */
export function nodosDelLayout(layout: Layout): NodoPosicionado[] {
  return layout.columnas.flatMap((c) => c.nodos);
}
