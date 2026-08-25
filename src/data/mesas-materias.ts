/**
 * ============================================================================
 *  QUÉ MATERIA SE RINDE EN QUÉ MESA
 * ============================================================================
 *
 *  ⚠️ LEER ESTO ANTES DE CONFIAR EN EL DATO.
 *
 *  La única distribución de materias por mesa que circula es el "CALENDARIO
 *  MESAS" que publica **Alternativa Tecnológica** (un centro de estudiantes),
 *  no el Departamento. Se verificó que la página oficial de Diseño Curricular
 *  y la de Horarios **no publican esta información**.
 *
 *  Y esa lista está escrita con **nombres del Plan 2008**: Gestión de Datos,
 *  Matemática Discreta, Sistemas y Organizaciones, Modelos Numéricos, Química,
 *  Sistemas de Representación. Varias de esas materias ni existen en el 2023.
 *
 *  Por eso cada asignación lleva su nivel de confianza:
 *
 *    'exacta'        el nombre coincide con el del Plan 2023.
 *    'interpretada'  nosotros leímos el nombre del 2008 como su equivalente
 *                    del 2023. Puede estar mal.
 *
 *  Y hay materias del Plan 2023 que **no figuran en ninguna mesa**: quedan sin
 *  entrada acá y la app dice "mesa no publicada" en vez de inventarles una.
 *
 *  Riesgo de fondo, que conviene tener presente: si la distribución está
 *  definida para el Plan 2008, puede que directamente **no aplique** al 2023 y
 *  que la facultad tenga otra sin publicar. Confirmá siempre en el
 *  Departamento antes de anotarte.
 * ============================================================================
 */

export type ConfianzaMesa = 'exacta' | 'interpretada';

export interface AsignacionMesa {
  /** N° oficial del Plan 2023, o el slug si es electiva. */
  materia: number | string;
  mesa: 1 | 2 | 3;
  confianza: ConfianzaMesa;
  /** Cómo figura en el listado original. */
  comoFigura: string;
}

const exacta = (materia: number | string, mesa: 1 | 2 | 3, comoFigura: string): AsignacionMesa => ({
  materia,
  mesa,
  confianza: 'exacta',
  comoFigura,
});

const leida = (materia: number | string, mesa: 1 | 2 | 3, comoFigura: string): AsignacionMesa => ({
  materia,
  mesa,
  confianza: 'interpretada',
  comoFigura,
});

export const ASIGNACIONES: readonly AsignacionMesa[] = [
  // ── MESA 1 ────────────────────────────────────────────────────────────────
  exacta(1, 1, 'Analisis Matematico I'),
  exacta(3, 1, 'Fisica I'),
  exacta(6, 1, 'Algoritmos y Estructuras de Datos'),
  exacta(17, 1, 'Probabilidades y Estadisticas'),
  exacta(18, 1, 'Economia'),
  exacta(24, 1, 'Legislacion'),
  exacta(27, 1, 'Investigacion Operativa'),
  exacta(28, 1, 'Simulacion'),
  exacta(31, 1, 'Inteligencia Artificial'),
  leida(16, 1, 'Analisis de Sistemas'),
  leida(19, 1, 'Gestion de Datos'),
  leida(21, 1, 'Comunicaciones'),
  leida(22, 1, 'Modelos Numericos'),
  leida(30, 1, 'Administracion de Recursos'),
  leida(34, 1, 'Administracion Gerencial'),
  leida('el-redes-wan', 1, 'Nuevas Tecnologias de Redes WAN (elect)'),

  // ── MESA 2 ────────────────────────────────────────────────────────────────
  exacta(2, 2, 'Algebra y Geometria Analitica'),
  exacta(10, 2, 'Fisica II'),
  exacta(13, 2, 'Sintaxis y Semantica de Lenguajes'),
  leida(4, 2, 'Ingles Tecnico I'),
  leida(8, 2, 'Sistemas y Organizaciones'),
  leida(12, 2, 'Ingles Tecnico II'),
  leida(23, 2, 'Diseño de Sistemas'),
  leida(26, 2, 'Redes de Informacion'),
  leida(33, 2, 'Sistemas de Gestion 1'),
  leida('el-sig', 2, 'Sist. De Informacion Geografico (elect)'),
  leida('el-sgc', 2, 'Sist. Inf. p/Gestion de Calidad (elect)'),

  // ── MESA 3 ────────────────────────────────────────────────────────────────
  exacta(7, 3, 'Arquitectura de Computadores'),
  exacta(9, 3, 'Analisis Matematico II'),
  exacta(11, 3, 'Ingenieria y Sociedad'),
  exacta(14, 3, 'Paradigmas de Programación'),
  exacta(15, 3, 'Sistemas Operativos'),
  leida(5, 3, 'Matematica Discreta'),
  leida(29, 3, 'Teoria de Control'),
  leida(36, 3, 'Proyecto'),
  leida('el-seguridad-informatica', 3, 'Seguridad Informatica (elect)'),
];

/**
 * Materias del Plan 2023 que **no figuran en ninguna mesa** del listado.
 * Se documentan para que quede claro que es un hueco de la fuente y no un
 * olvido nuestro.
 */
export const SIN_MESA_PUBLICADA: readonly number[] = [
  20, // Desarrollo de Software
  25, // Ingeniería y Calidad de Software
  32, // Ciencia de Datos
  35, // Seguridad en los Sistemas de Información
  100, // Seminario Integrador
];

export default ASIGNACIONES;
