/**
 * ============================================================================
 *  PLAN DE ESTUDIOS — UTN FRT
 *  Ingeniería en Sistemas de Información — Plan 2023 (Ord. CS N° 1877)
 *  Título intermedio: Analista Desarrollador/a Universitario/a de Sistemas
 *                     de Información — Plan 2023 (Ord. CS N° 1910)
 *
 *  FUENTES NORMATIVAS (transcriptas literalmente de los PDFs oficiales):
 *   - Ord. CS N° 1878/2022 → Régimen de correlatividades ISI Plan 2023 (Anexo I)
 *   - Ord. CS N° 1911/2022 → Régimen de correlatividades Analista (Anexo I)
 *   - Ord. CS N° 1939/2023 → Amplía el régimen de equivalencias del Analista
 *   - Ord. CS N° 1877/2022 → Estructura curricular (carga horaria y régimen)
 *   - Res. CD FRT N° 2386/2025 → Electivas habilitadas 2026–2029 (Planes 2008 y 2023)
 *   - Res. CD FRT N° 1082/2026 → Amplía 2386: Introd. al Análisis de Datos e Ing. de Datos
 *   - Res. CD FRT N° 1064/2026 → Modifica contenidos (Unidad 3, IPv6) de Diseño de Redes
 *                                LAN Modernas. NO cambia correlativas ni estructura.
 *   - Depto. ISI FRT, "Diseño Curricular" → tabla «Correlativas Plan 2023 - Electivas»
 *                                (21 registros). Publicada por el Departamento; confirma
 *                                y corrige lo que el OCR de las resoluciones dejó ilegible.
 *
 *  ⚠️ Los `id` numéricos (1–36) son los N° oficiales del Anexo I de la Ord. 1878.
 *     TODA correlativa se expresa con esos números. No los renumeres.
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

/** Estados posibles del avance del estudiante sobre una materia. */
export type EstadoMateria =
  | 'pendiente'   // todavía no la cursó (puede estar habilitada o bloqueada)
  | 'cursando'    // la está cursando este período
  | 'regular'     // cursada aprobada, adeuda el final
  | 'aprobada'    // final aprobado
  | 'recursa';    // perdió la cursada / debe recursar

/** Estado derivado (NO se persiste: se calcula desde el grafo + progreso). */
export type Habilitacion =
  | 'disponible'          // cumple correlativas para cursar
  | 'bloqueada'           // no cumple correlativas para cursar
  | 'final-habilitado'    // regular + cumple correlativas para rendir
  | 'final-bloqueado';    // regular pero le falta un final correlativo

export type Regimen =
  | 'anual'
  | 'cuatrimestral-1'
  | 'cuatrimestral-2'
  | 'cuatrimestral-1y2'
  /**
   * El Departamento la lista en el catálogo pero deja vacía la columna
   * "CARGA HORARIA Y DICTADO". No es lo mismo que no saberlo: la materia existe,
   * el dato de dictado no está publicado.
   */
  | 'sin-publicar';

export type Bloque =
  | 'Ciencias Básicas'
  | 'Tecnologías Básicas'
  | 'Tecnologías Aplicadas'
  | 'Ciencias y Tecnologías Complementarias';

export interface Correlativas {
  /** Para INSCRIBIRSE A CURSAR la materia. */
  paraCursar: {
    /** IDs que deben estar al menos REGULARES (cursada aprobada). */
    regularizadas: number[];
    /** IDs que deben tener el FINAL APROBADO. */
    aprobadas: number[];
  };
  /** Para RENDIR EL FINAL de la materia. */
  paraRendir: {
    aprobadas: number[];
  };
}

export interface Materia {
  id: number;
  /** Código estable para URLs y localStorage. Ej: 'isi-19' o 'el-uxpd'. */
  slug: string;
  nombre: string;
  /** Nivel/año del plan: 1..5 */
  nivel: 1 | 2 | 3 | 4 | 5;
  regimen: Regimen;
  horasSemanales: number;
  horasTotales: number;
  bloque?: Bloque;
  areaConocimiento?: string;
  tipo: 'obligatoria' | 'electiva' | 'practica' | 'integradora';
  /** true si es una de las 5 materias integradoras del plan. */
  integradora?: boolean;
  /** true si cuenta para el título intermedio de Analista. */
  cuentaParaAnalista?: boolean;
  correlativas: Correlativas;
  /** Reglas que no se pueden expresar como lista de IDs. */
  reglaEspecial?: string;
  /** Marcá con true los datos que todavía no verificaste contra el PDF. */
  requiereVerificacion?: boolean;
  notas?: string;
}

export interface PlanDeEstudios {
  id: string;
  universidad: string;
  facultad: string;
  carrera: string;
  plan: string;
  ordenanza: string;
  tituloIntermedio: {
    nombre: string;
    ordenanza: string;
    /** IDs de materias del plan requeridas + materias exclusivas del título. */
    materias: number[];
  };
  /** Horas de electivas exigidas por nivel (Ord. 1877). */
  requisitoElectivas: { nivel3: number; nivel4: number; nivel5: number; total: number };
  materias: Materia[];
  electivas: Materia[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const sin: Correlativas = {
  paraCursar: { regularizadas: [], aprobadas: [] },
  paraRendir: { aprobadas: [] },
};

/**
 * El Anexo I de la Ord. 1878 titula la columna "PARA CURSAR Y RENDIR".
 * Interpretación codificada (la estándar en UTN):
 *   - para CURSAR  → las de la columna "Cursadas" deben estar REGULARES,
 *                    las de la columna "Aprobadas" deben tener FINAL aprobado.
 *   - para RENDIR  → TODAS (cursadas + aprobadas) deben tener FINAL aprobado.
 * Si tu Facultad Regional aplica otro criterio, cambiá SOLO esta función.
 */
const corr = (cursadas: number[] = [], aprobadas: number[] = []): Correlativas => ({
  paraCursar: { regularizadas: cursadas, aprobadas },
  paraRendir: { aprobadas: [...cursadas, ...aprobadas].sort((a, b) => a - b) },
});

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAS OBLIGATORIAS — ISI Plan 2023
// Correlativas: Ord. 1878 Anexo I · Carga horaria: Ord. 1877 estructura curricular
// ─────────────────────────────────────────────────────────────────────────────

export const MATERIAS: Materia[] = [
  // ── NIVEL I ───────────────────────────────────────────────────────────────
  { id: 1,  slug: 'isi-01', nombre: 'Análisis Matemático I',                nivel: 1, regimen: 'anual', horasSemanales: 5, horasTotales: 120, bloque: 'Ciencias Básicas',      tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: sin },
  { id: 2,  slug: 'isi-02', nombre: 'Álgebra y Geometría Analítica',        nivel: 1, regimen: 'anual', horasSemanales: 5, horasTotales: 120, bloque: 'Ciencias Básicas',      tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: sin },
  { id: 3,  slug: 'isi-03', nombre: 'Física I',                             nivel: 1, regimen: 'anual', horasSemanales: 5, horasTotales: 120, bloque: 'Ciencias Básicas',      tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: sin },
  { id: 4,  slug: 'isi-04', nombre: 'Inglés I',                             nivel: 1, regimen: 'anual', horasSemanales: 2, horasTotales:  48, bloque: 'Ciencias y Tecnologías Complementarias', tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: sin },
  { id: 5,  slug: 'isi-05', nombre: 'Lógica y Estructuras Discretas',       nivel: 1, regimen: 'anual', horasSemanales: 3, horasTotales:  72, bloque: 'Ciencias Básicas',      tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: sin },
  { id: 6,  slug: 'isi-06', nombre: 'Algoritmos y Estructuras de Datos',    nivel: 1, regimen: 'anual', horasSemanales: 5, horasTotales: 120, bloque: 'Tecnologías Básicas',   tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: sin },
  { id: 7,  slug: 'isi-07', nombre: 'Arquitectura de Computadoras',         nivel: 1, regimen: 'anual', horasSemanales: 4, horasTotales:  96, bloque: 'Tecnologías Básicas',   tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: sin },
  { id: 8,  slug: 'isi-08', nombre: 'Sistemas y Procesos de Negocio',       nivel: 1, regimen: 'anual', horasSemanales: 3, horasTotales:  72, bloque: 'Tecnologías Básicas',   tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: sin },

  // ── NIVEL II ──────────────────────────────────────────────────────────────
  { id: 9,  slug: 'isi-09', nombre: 'Análisis Matemático II',               nivel: 2, regimen: 'anual', horasSemanales: 5, horasTotales: 120, bloque: 'Ciencias Básicas',      tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: corr([1, 2]) },
  { id: 10, slug: 'isi-10', nombre: 'Física II',                            nivel: 2, regimen: 'anual', horasSemanales: 5, horasTotales: 120, bloque: 'Ciencias Básicas',      tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: corr([1, 3]) },
  { id: 11, slug: 'isi-11', nombre: 'Ingeniería y Sociedad',                nivel: 2, regimen: 'anual', horasSemanales: 2, horasTotales:  48, bloque: 'Ciencias y Tecnologías Complementarias', tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: sin },
  { id: 12, slug: 'isi-12', nombre: 'Inglés II',                            nivel: 2, regimen: 'anual', horasSemanales: 2, horasTotales:  48, bloque: 'Ciencias y Tecnologías Complementarias', tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: corr([4]) },
  { id: 13, slug: 'isi-13', nombre: 'Sintaxis y Semántica de los Lenguajes',nivel: 2, regimen: 'anual', horasSemanales: 4, horasTotales:  96, bloque: 'Tecnologías Básicas',   tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: corr([5, 6]) },
  { id: 14, slug: 'isi-14', nombre: 'Paradigmas de Programación',           nivel: 2, regimen: 'anual', horasSemanales: 4, horasTotales:  96, bloque: 'Tecnologías Básicas',   tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: corr([5, 6]) },
  { id: 15, slug: 'isi-15', nombre: 'Sistemas Operativos',                  nivel: 2, regimen: 'anual', horasSemanales: 4, horasTotales:  96, bloque: 'Tecnologías Básicas',   tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: corr([7]) },
  { id: 16, slug: 'isi-16', nombre: 'Análisis de Sistemas de Información',  nivel: 2, regimen: 'anual', horasSemanales: 6, horasTotales: 144, bloque: 'Tecnologías Aplicadas', tipo: 'integradora', integradora: true, cuentaParaAnalista: true, correlativas: corr([6, 8]) },

  // ── NIVEL III ─────────────────────────────────────────────────────────────
  { id: 17, slug: 'isi-17', nombre: 'Probabilidad y Estadística',           nivel: 3, regimen: 'anual', horasSemanales: 3, horasTotales:  72, bloque: 'Ciencias Básicas',      tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: corr([1, 2]) },
  { id: 18, slug: 'isi-18', nombre: 'Economía',                             nivel: 3, regimen: 'anual', horasSemanales: 3, horasTotales:  72, bloque: 'Ciencias y Tecnologías Complementarias', tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: corr([], [1, 2]) },
  { id: 19, slug: 'isi-19', nombre: 'Bases de Datos',                       nivel: 3, regimen: 'anual', horasSemanales: 4, horasTotales:  96, bloque: 'Tecnologías Aplicadas', tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: corr([13, 16], [5, 6]) },
  { id: 20, slug: 'isi-20', nombre: 'Desarrollo de Software',               nivel: 3, regimen: 'anual', horasSemanales: 4, horasTotales:  96, bloque: 'Tecnologías Aplicadas', tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: corr([14, 16], [5, 6]) },
  { id: 21, slug: 'isi-21', nombre: 'Comunicación de Datos',                nivel: 3, regimen: 'anual', horasSemanales: 4, horasTotales:  96, bloque: 'Tecnologías Básicas',   tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: corr([], [3, 7]) },
  { id: 22, slug: 'isi-22', nombre: 'Análisis Numérico',                    nivel: 3, regimen: 'anual', horasSemanales: 3, horasTotales:  72, bloque: 'Ciencias Básicas',      tipo: 'obligatoria', cuentaParaAnalista: true, correlativas: corr([9], [1, 2]) },
  { id: 23, slug: 'isi-23', nombre: 'Diseño de Sistemas de Información',    nivel: 3, regimen: 'anual', horasSemanales: 6, horasTotales: 144, bloque: 'Tecnologías Aplicadas', tipo: 'integradora', integradora: true, cuentaParaAnalista: true, correlativas: corr([14, 16], [4, 6, 8]) },

  // ── NIVEL IV ──────────────────────────────────────────────────────────────
  { id: 24, slug: 'isi-24', nombre: 'Legislación',                          nivel: 4, regimen: 'anual', horasSemanales: 2, horasTotales:  48, bloque: 'Ciencias y Tecnologías Complementarias', tipo: 'obligatoria', correlativas: corr([11]) },
  { id: 25, slug: 'isi-25', nombre: 'Ingeniería y Calidad de Software',     nivel: 4, regimen: 'anual', horasSemanales: 3, horasTotales:  72, bloque: 'Tecnologías Aplicadas', tipo: 'obligatoria', correlativas: corr([19, 20, 23], [13, 14]) },
  { id: 26, slug: 'isi-26', nombre: 'Redes de Datos',                       nivel: 4, regimen: 'anual', horasSemanales: 4, horasTotales:  96, bloque: 'Tecnologías Aplicadas', tipo: 'obligatoria', correlativas: corr([15, 21]) },
  { id: 27, slug: 'isi-27', nombre: 'Investigación Operativa',              nivel: 4, regimen: 'anual', horasSemanales: 4, horasTotales:  96, bloque: 'Tecnologías Básicas',   tipo: 'obligatoria', correlativas: corr([17, 22]) },
  { id: 28, slug: 'isi-28', nombre: 'Simulación',                           nivel: 4, regimen: 'anual', horasSemanales: 3, horasTotales:  72, bloque: 'Tecnologías Aplicadas', tipo: 'obligatoria', correlativas: corr([17], [9]) },
  { id: 29, slug: 'isi-29', nombre: 'Tecnologías para la Automatización',   nivel: 4, regimen: 'anual', horasSemanales: 3, horasTotales:  72, bloque: 'Tecnologías Aplicadas', tipo: 'obligatoria', correlativas: corr([10, 22], [9]) },
  { id: 30, slug: 'isi-30', nombre: 'Administración de Sistemas de Información', nivel: 4, regimen: 'anual', horasSemanales: 6, horasTotales: 144, bloque: 'Tecnologías Aplicadas', tipo: 'integradora', integradora: true, correlativas: corr([18, 23], [16]) },

  // ── NIVEL V ───────────────────────────────────────────────────────────────
  { id: 31, slug: 'isi-31', nombre: 'Inteligencia Artificial',              nivel: 5, regimen: 'anual', horasSemanales: 3, horasTotales:  72, bloque: 'Tecnologías Aplicadas', tipo: 'obligatoria', correlativas: corr([28], [17, 22]) },
  { id: 32, slug: 'isi-32', nombre: 'Ciencia de Datos',                     nivel: 5, regimen: 'anual', horasSemanales: 3, horasTotales:  72, bloque: 'Tecnologías Aplicadas', tipo: 'obligatoria', correlativas: corr([28], [17, 19]) },
  { id: 33, slug: 'isi-33', nombre: 'Sistemas de Gestión',                  nivel: 5, regimen: 'anual', horasSemanales: 4, horasTotales:  96, bloque: 'Tecnologías Aplicadas', tipo: 'obligatoria', correlativas: corr([18, 27], [23]) },
  { id: 34, slug: 'isi-34', nombre: 'Gestión Gerencial',                    nivel: 5, regimen: 'anual', horasSemanales: 3, horasTotales:  72, bloque: 'Ciencias y Tecnologías Complementarias', tipo: 'obligatoria', correlativas: corr([24, 30], [18]) },
  { id: 35, slug: 'isi-35', nombre: 'Seguridad en los Sistemas de Información', nivel: 5, regimen: 'anual', horasSemanales: 3, horasTotales: 72, bloque: 'Tecnologías Aplicadas', tipo: 'obligatoria', correlativas: corr([26, 30], [20, 21]) },
  {
    id: 36, slug: 'isi-36', nombre: 'Proyecto Final', nivel: 5, regimen: 'anual',
    horasSemanales: 6, horasTotales: 144, bloque: 'Tecnologías Aplicadas',
    tipo: 'integradora', integradora: true,
    correlativas: {
      paraCursar: { regularizadas: [25, 26, 30], aprobadas: [12, 20, 23] },
      // Regla textual del Anexo I: "Es condición para rendir Proyecto Final,
      // aprobar todas las asignaturas previas del Plan de Estudios."
      paraRendir: { aprobadas: Array.from({ length: 35 }, (_, i) => i + 1) },
    },
    reglaEspecial: 'TODAS_LAS_PREVIAS_APROBADAS_PARA_RENDIR',
  },

  // ── PRÁCTICA PROFESIONAL SUPERVISADA ──────────────────────────────────────
  {
    id: 37, slug: 'isi-pps', nombre: 'Práctica Profesional Supervisada', nivel: 5,
    regimen: 'anual', horasSemanales: 0, horasTotales: 200,
    tipo: 'practica',
    correlativas: {
      // Mismos requisitos que la inscripción a Proyecto Final (Anexo I, Ord. 1878).
      paraCursar: { regularizadas: [25, 26, 30], aprobadas: [12, 20, 23] },
      paraRendir: { aprobadas: [] },
    },
    reglaEspecial: 'MISMOS_REQUISITOS_QUE_INSCRIPCION_A_PROYECTO_FINAL',
    notas: '200 hs. No tiene final; se acredita.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TÍTULO INTERMEDIO — Analista Desarrollador/a Universitario/a de SI
// Ord. CS N° 1910 (diseño) + Ord. CS N° 1911 Anexo I (correlatividades)
// Son las materias 1..23 del plan ISI + una materia EXCLUSIVA del título:
// Seminario Integrador (N° 24 en la numeración del Anexo I de la Ord. 1911).
// ─────────────────────────────────────────────────────────────────────────────

export const SEMINARIO_INTEGRADOR: Materia = {
  id: 100, slug: 'ad-seminario', nombre: 'Seminario Integrador',
  nivel: 3, regimen: 'anual', horasSemanales: 4, horasTotales: 96,
  bloque: 'Tecnologías Aplicadas', tipo: 'integradora', integradora: true,
  cuentaParaAnalista: true,
  correlativas: {
    // Ord. 1911 Anexo I: Cursada 16 · Aprobadas 6 - 8 - 13 - 14
    paraCursar: { regularizadas: [16], aprobadas: [6, 8, 13, 14] },
    // "Es condición para rendir Seminario Integrador, aprobar todas las
    //  asignaturas previas del Plan de Estudios" (del título intermedio: 1..23).
    paraRendir: { aprobadas: Array.from({ length: 23 }, (_, i) => i + 1) },
  },
  reglaEspecial: 'TODAS_LAS_1_A_23_APROBADAS_PARA_RENDIR',
  notas: 'Materia exclusiva del título intermedio. No forma parte de las 36 de ISI.',
  requiereVerificacion: true, // carga horaria no figura en la Ord. 1911: verificar en FRT
};

// ─────────────────────────────────────────────────────────────────────────────
// ELECTIVAS FRT — Res. CD N° 2386/2025 (+ 1082/2026)
// Habilitadas para el período 2026–2029, Planes 2008 y 2023.
//
// Las correlativas se transcribieron desde PDFs escaneados vía OCR y después se
// contrastaron contra la tabla «Correlativas Plan 2023 - Electivas» que publica
// el Departamento en su página de Diseño Curricular. Donde las dos fuentes
// coinciden, el dato está confirmado; donde el OCR había quedado ilegible, manda
// la tabla del Departamento y se sacó el `requiereVerificacion`.
//
// ⚠️ Esa tabla **no publica la columna "para rendir"**: solo Regular/Aprobada
//    para cursar. Para las filas confirmadas aplicamos la misma interpretación
//    que la Ord. 1878 le da a las obligatorias (ver `corr()`): para rendir el
//    final hay que tener aprobadas todas las correlativas de cursada. Las filas
//    que todavía no se confirmaron conservan lo que dijo el OCR.
// ─────────────────────────────────────────────────────────────────────────────

const el = (
  slug: string, nombre: string, nivel: 1 | 2 | 3 | 4 | 5, regimen: Regimen,
  hs: number, hsTot: number, area: string, bloque: Bloque,
  cursarReg: number[], cursarApr: number[], rendirApr: number[],
  flags: Partial<Materia> = {},
): Materia => ({
  id: 0, slug, nombre, nivel, regimen, horasSemanales: hs, horasTotales: hsTot,
  areaConocimiento: area, bloque, tipo: 'electiva',
  correlativas: {
    paraCursar: { regularizadas: cursarReg, aprobadas: cursarApr },
    paraRendir: { aprobadas: rendirApr },
  },
  ...flags,
});

export const ELECTIVAS: Materia[] = [
  // ── Res. 2386/2025 — 1ª parte ─────────────────────────────────────────────
  el('el-ux-productos', 'Diseño UX para Productos Digitales', 3, 'cuatrimestral-2', 4, 64,
     'Gestión Ingenieril', 'Tecnologías Aplicadas', [8, 16], [], [8, 16]),

  el('el-seguridad-informatica', 'Seguridad Informática', 3, 'cuatrimestral-1y2', 4, 64,
     'Sistemas de Información', 'Tecnologías Aplicadas', [16], [], [16],
     { notas: 'El OCR de la Res. 2386 dejó la tabla ilegible; la del Departamento confirma Análisis de SI regularizada.' }),

  el('el-ux-ui', 'Fundamentos del Diseño de UX/UI', 3, 'cuatrimestral-2', 4, 64,
     'Sistemas de Información', 'Tecnologías Aplicadas', [16], [], [16]),

  el('el-ing-datos-fundamentos', 'Fundamentos de Ingeniería de Datos', 4, 'cuatrimestral-2', 4, 64,
     'Desarrollo de Software', 'Tecnologías Aplicadas', [19, 21], [6], [6, 19, 21],
     { notas: 'La tabla del Departamento exige aprobada solo Algoritmos (6). El OCR había sumado Paradigmas (14), que no figura.' }),

  el('el-cloud', 'Computación en la Nube', 4, 'cuatrimestral-2', 4, 64,
     'Computación y Comunicación de Datos', 'Tecnologías Aplicadas', [15, 23, 19], [], [15, 23, 19]),

  el('el-sgc', 'Sistemas de Gestión de la Calidad', 4, 'cuatrimestral-2', 6, 96,
     'Sistemas de Información', 'Ciencias y Tecnologías Complementarias', [16, 23], [], [16, 23],
     { notas: 'Cursada confirmada por la tabla del Departamento: Análisis y Diseño de SI regularizadas.' }),

  el('el-seg-redes', 'Seguridad en Redes e Infraestructura', 4, 'cuatrimestral-2', 4, 64,
     'Computación y Comunicación de Datos', 'Tecnologías Aplicadas', [26], [15, 21], [15, 21]),

  // ── Res. 2386/2025 — 2ª parte ─────────────────────────────────────────────
  el('el-auditoria', 'Auditoría en Sistemas de Información', 4, 'cuatrimestral-1', 4, 64,
     'Gestión Ingenieril', 'Tecnologías Aplicadas', [23], [8, 16], [8, 16],
     { requiereVerificacion: true, notas: 'CONFLICTO DE FUENTES: el OCR de la Res. 2386 exige 8 y 16 aprobadas; la tabla del Departamento deja esa columna vacía y solo pide Diseño de SI (23) regularizada. Mantenemos el criterio más exigente —quitar un requisito habilita una inscripción que puede rebotar— hasta confirmarlo en Departamento.' }),

  el('el-innovacion', 'Innovación y Gestión de la Tecnología', 5, 'cuatrimestral-1', 6, 96,
     'Gestión Ingenieril', 'Ciencias y Tecnologías Complementarias', [30], [], [30]),

  el('el-agilidad', 'Agilidad y Gestión de Productos Digitales', 5, 'cuatrimestral-1', 4, 64,
     'Gestión Ingenieril', 'Tecnologías Aplicadas', [25, 30, 20], [], [25, 30, 23]),

  el('el-redes-lan', 'Diseño de Redes LAN Modernas', 5, 'cuatrimestral-2', 4, 64,
     'Computación y Comunicación de Datos', 'Tecnologías Aplicadas', [26], [21], [21, 26],
     { notas: 'Res. CD 1064/2026 agrega la Unidad 3 (Protocolo IPv6) al programa. La tabla del Departamento suma Comunicación de Datos (21) aprobada, que el OCR no había tomado.' }),

  el('el-virtualizacion', 'Virtualización: Consolidación de Servidores', 5, 'cuatrimestral-1', 4, 64,
     'Computación y Comunicación de Datos', 'Tecnologías Aplicadas', [26], [], [26]),

  el('el-capital-humano', 'Capital Humano y Gestión del Conocimiento', 5, 'cuatrimestral-2', 4, 64,
     'Gestión Ingenieril', 'Ciencias y Tecnologías Complementarias', [30], [], [30]),

  el('el-redes-wan', 'Nuevas Tecnologías de Redes WAN', 5, 'cuatrimestral-1y2', 4, 64,
     'Computación y Comunicación de Datos', 'Tecnologías Aplicadas', [21, 26], [], [21, 26]),

  // ── Res. 1082/2026 (amplía la 2386) ───────────────────────────────────────
  el('el-intro-analisis-datos', 'Introducción al Análisis de Datos', 5, 'cuatrimestral-1', 6, 96,
     'Sistemas de Información', 'Tecnologías Aplicadas', [23, 22], [17, 19, 14], [14, 17, 19, 22, 23],
     { notas: 'La tabla del Departamento suma Análisis Numérico (22) regularizada y Bases de Datos (19) aprobada. El cuatrimestre no figura: dice solo "6 Horas".' }),

  el('el-ingenieria-datos', 'Ingeniería de Datos', 5, 'cuatrimestral-1', 4, 64,
     'Computación y Comunicación de Datos', 'Tecnologías Aplicadas', [26, 30], [23], [23, 26, 30],
     { notas: 'La tabla del Departamento ubica Diseño de SI (23) en la columna de aprobadas para cursar. El cuatrimestre no figura: dice solo "4 Horas".' }),

  // ── Tabla del Departamento (Diseño Curricular) ────────────────────────────
  // Las 5 que no figuran en las Res. 2386/2025 ni 1082/2026 pero sí en el
  // listado oficial del Departamento, que trae 21 electivas. Ese listado no
  // publica área de conocimiento ni bloque: quedan sin completar antes que
  // inventarlos.
  {
    id: 0, slug: 'el-gestion-procesos', nombre: 'Gestión de Procesos de Negocio',
    nivel: 3, regimen: 'cuatrimestral-1', horasSemanales: 4, horasTotales: 64,
    tipo: 'electiva',
    correlativas: { paraCursar: { regularizadas: [], aprobadas: [] }, paraRendir: { aprobadas: [] } },
    requiereVerificacion: true,
    notas: 'Carga horaria (4 hs semanales, 1° cuatrimestre) aportada por el usuario: la tabla del Departamento deja esa celda vacía y el PDF de la Res. 2386 es un escaneo de imágenes. Las correlativas siguen sin fuente.',
  },
  {
    id: 0, slug: 'el-prog-distribuidas', nombre: 'Programación de Aplicaciones Distribuidas',
    nivel: 4, regimen: 'sin-publicar', horasSemanales: 0, horasTotales: 0,
    tipo: 'electiva',
    correlativas: { paraCursar: { regularizadas: [], aprobadas: [] }, paraRendir: { aprobadas: [] } },
    requiereVerificacion: true,
    notas: 'La tabla del Departamento la lista sin correlativas y sin carga horaria. Con 0 hs no suma al requisito de 96/144/240: confirmá el dato antes de contarla para recibirte.',
  },
  {
    id: 0, slug: 'el-sig', nombre: 'Sistemas de Información Geográficos',
    nivel: 4, regimen: 'cuatrimestral-1y2', horasSemanales: 4, horasTotales: 64,
    tipo: 'electiva',
    correlativas: {
      // La tabla dice «Gestión de Datos», que es el nombre de la materia en el
      // Plan 2008; la equivalente del 2023 es Bases de Datos (19).
      paraCursar: {
        regularizadas: [19, 23],
        // «Todas las Materias del 2° Nivel Excepto Física 2» → 9-11-12-13-14-15-16.
        aprobadas: [9, 11, 12, 13, 14, 15, 16],
      },
      paraRendir: { aprobadas: [9, 11, 12, 13, 14, 15, 16, 19, 23] },
    },
    reglaEspecial: 'TODAS_LAS_DE_NIVEL_2_EXCEPTO_FISICA_II_APROBADAS_PARA_CURSAR',
    requiereVerificacion: true,
    notas: 'Dos interpretaciones nuestras: «Gestión de Datos» se leyó como Bases de Datos (19), y «Todas las Materias del 2° Nivel Excepto Física 2» se expandió a 9-11-12-13-14-15-16. Confirmar en Departamento.',
  },
  {
    id: 0, slug: 'el-heuristicas', nombre: 'Heurísticas y Auto Machine Learning',
    nivel: 4, regimen: 'cuatrimestral-2', horasSemanales: 4, horasTotales: 64,
    tipo: 'electiva',
    correlativas: {
      paraCursar: { regularizadas: [22], aprobadas: [14, 17] },
      paraRendir: { aprobadas: [14, 17, 22] },
    },
    notas: 'Fuente: tabla de electivas del Departamento. Sin área de conocimiento ni bloque publicados.',
  },
  {
    id: 0, slug: 'el-testing', nombre: 'Testing Automatizado de Software',
    nivel: 5, regimen: 'cuatrimestral-2', horasSemanales: 4, horasTotales: 64,
    tipo: 'electiva',
    correlativas: {
      paraCursar: { regularizadas: [19, 20, 23], aprobadas: [] },
      paraRendir: { aprobadas: [19, 20, 23] },
    },
    notas: 'Fuente: tabla de electivas del Departamento. Sin área de conocimiento ni bloque publicados.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PLAN COMPLETO
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN: PlanDeEstudios = {
  id: 'utn-frt-isi-2023',
  universidad: 'Universidad Tecnológica Nacional',
  facultad: 'Facultad Regional Tucumán',
  carrera: 'Ingeniería en Sistemas de Información',
  plan: '2023',
  ordenanza: 'Ord. CS N° 1877/2022',
  tituloIntermedio: {
    nombre: 'Analista Desarrollador/a Universitario/a de Sistemas de Información',
    ordenanza: 'Ord. CS N° 1910/2022 · Correlatividades: Ord. CS N° 1911/2022',
    materias: [...Array.from({ length: 23 }, (_, i) => i + 1), 100],
  },
  requisitoElectivas: { nivel3: 96, nivel4: 144, nivel5: 240, total: 480 },
  materias: [...MATERIAS, SEMINARIO_INTEGRADOR],
  electivas: ELECTIVAS,
};

export default PLAN;
