/**
 * ============================================================================
 *  MOTOR DE CORRELATIVAS — UTrackerN
 * ============================================================================
 *
 *  Todo lo que sabe la app sobre "qué puedo cursar" y "qué puedo rendir" sale
 *  de acá. Son funciones **puras**: entra `(materia, progreso, grafo)`, sale un
 *  valor. No hay React, no hay localStorage, no hay side effects.
 *
 *  Los dos ejes que hacen distinto a este tracker (§2 del prompt maestro):
 *
 *    puedeCursar        → las de `paraCursar.regularizadas` están `regular`
 *                         O `aprobada`, y las de `paraCursar.aprobadas` están
 *                         `aprobada`.
 *    puedeRendirFinal   → la materia está `regular` Y todas las de
 *                         `paraRendir.aprobadas` están `aprobada`.
 *
 *  Son independientes: Economía (18) se puede tener bloqueada para cursar con
 *  Análisis Matemático I regular, porque exige el FINAL aprobado. Ese es el
 *  caso que un tracker genérico se come.
 * ============================================================================
 */

import PLAN, {
  type EstadoMateria,
  type Habilitacion,
  type Materia,
  type PlanDeEstudios,
} from '../data/plan-utn-frt-isi-2023';
import { estaAprobada, estaRegularizada, estadoDe } from './progreso';
import type { Progreso, RegistroProgreso } from './tipos';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES DE DOMINIO
// ─────────────────────────────────────────────────────────────────────────────

/** N° oficial de Proyecto Final en el Anexo I de la Ord. 1878. */
export const ID_PROYECTO_FINAL = 36;
/** N° de la Práctica Profesional Supervisada. No tiene final: se acredita. */
export const ID_PPS = 37;
/**
 * Seminario Integrador usa `id: 100` porque en la Ord. 1911 es el N° 24 y en la
 * Ord. 1878 el N° 24 es Legislación. Es **exclusivo del título intermedio**:
 * no forma parte de las 36 de Ingeniería.
 */
export const ID_SEMINARIO_INTEGRADOR = 100;
/** Las electivas del dataset comparten `id: 0` como centinela: se indexan por slug. */
export const ID_CENTINELA_ELECTIVA = 0;

/** Carga horaria obligatoria del plan (Ord. 1877). Test de humo del dataset. */
export const HORAS_OBLIGATORIAS_ESPERADAS = 3312;
/** Cantidad de asignaturas obligatorias de Ingeniería, sin contar la PPS. */
export const ASIGNATURAS_OBLIGATORIAS_ESPERADAS = 36;

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DEL GRAFO
// ─────────────────────────────────────────────────────────────────────────────

/** Para qué sirve la correlativa: habilitar la cursada o habilitar el final. */
export type TipoArista = 'cursar' | 'rendir';

/** Qué nivel de aprobación exige la correlativa. */
export type Exigencia = 'regularizada' | 'aprobada';

/** Una correlativa concreta: "para `hasta`, necesitás `desde` en tal condición". */
export interface Arista {
  /** `${desde}->${hasta}@${tipo}` — estable, sirve como `id` de React Flow. */
  id: string;
  /** Slug de la materia REQUISITO. */
  desde: string;
  /** Slug de la materia que la exige. */
  hasta: string;
  tipo: TipoArista;
  exigencia: Exigencia;
}

/** Referencia a un `id` que no existe en el plan. La reporta el validador. */
export interface ReferenciaRota {
  slug: string;
  idInexistente: number;
  tipo: TipoArista;
  exigencia: Exigencia;
}

/**
 * Índice inmutable del plan. Se construye una vez y se pasa a todas las
 * funciones. Evita recorrer arrays de 53 materias en cada render.
 */
export interface Grafo {
  plan: PlanDeEstudios;
  /** Materias del plan (36 + PPS + Seminario Integrador). */
  materias: readonly Materia[];
  /** Catálogo de electivas habilitadas en FRT. */
  electivas: readonly Materia[];
  /** `materias` + `electivas`. */
  todas: readonly Materia[];
  porSlug: ReadonlyMap<string, Materia>;
  /** Solo materias del plan: las electivas comparten el `id` centinela 0. */
  porId: ReadonlyMap<number, Materia>;
  aristas: readonly Arista[];
  /** Aristas entrantes, indexadas por el slug de la materia que las exige. */
  requisitos: ReadonlyMap<string, readonly Arista[]>;
  /** Aristas salientes, indexadas por el slug de la materia requisito. */
  dependientes: ReadonlyMap<string, readonly Arista[]>;
  /** Correlativas que apuntan a un `id` que no está en el plan. Debería ir vacío. */
  referenciasRotas: readonly ReferenciaRota[];
}

/** Estado completo de UNA materia, ya derivado. Es lo que consume la tarjeta. */
export interface MateriaDerivada {
  materia: Materia;
  estado: EstadoMateria;
  puedeCursar: boolean;
  puedeRendirFinal: boolean;
  habilitacion: Habilitacion;
  /**
   * `regular` + le falta un final correlativo. Es el famoso
   * "falta final correlativo" y el error más común al anotarse a rendir.
   */
  faltaFinalCorrelativo: boolean;
  /** Correlativas incumplidas, con el motivo. Alimenta "REQUISITOS DIRECTOS". */
  requisitosFaltantes: readonly RequisitoFaltante[];
  /**
   * El estudiante marcó la materia como cursando/regular/aprobada sin cumplir
   * las correlativas para cursarla. Casi siempre es un clic errado o un avance
   * cargado a medias. No lo corregimos —el avance lo manda el usuario—, pero lo
   * señalamos para que nadie planifique el cuatrimestre sobre un dato mal
   * cargado.
   */
  inconsistente: boolean;
}

export interface RequisitoFaltante {
  materia: Materia;
  /** Para cursar la materia, o para rendirle el final. */
  para: TipoArista;
  exigencia: Exigencia;
  estadoActual: EstadoMateria;
}

const TIPOS_CURSAR: readonly TipoArista[] = ['cursar'];

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCCIÓN DEL ÍNDICE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Arma el índice del grafo a partir de un plan de estudios.
 *
 * Recorre las correlativas de todas las materias (plan + electivas) y genera
 * una arista por cada requisito, distinguiendo si habilita la **cursada** o el
 * **final**. Las referencias a `id` inexistentes no rompen: se acumulan en
 * `referenciasRotas` para que el validador las escupa.
 */
export function construirGrafo(plan: PlanDeEstudios = PLAN): Grafo {
  const materias = plan.materias;
  const electivas = plan.electivas;
  const todas: readonly Materia[] = [...materias, ...electivas];

  const porSlug = new Map<string, Materia>();
  for (const m of todas) porSlug.set(m.slug, m);

  const porId = new Map<number, Materia>();
  for (const m of materias) {
    if (m.id === ID_CENTINELA_ELECTIVA) continue;
    porId.set(m.id, m);
  }

  const aristas: Arista[] = [];
  const vistas = new Set<string>();
  const referenciasRotas: ReferenciaRota[] = [];

  const agregar = (
    materia: Materia,
    idRequisito: number,
    tipo: TipoArista,
    exigencia: Exigencia,
  ): void => {
    const requisito = porId.get(idRequisito);
    if (requisito === undefined) {
      referenciasRotas.push({ slug: materia.slug, idInexistente: idRequisito, tipo, exigencia });
      return;
    }
    const id = `${requisito.slug}->${materia.slug}@${tipo}`;
    if (vistas.has(id)) return;
    vistas.add(id);
    aristas.push({ id, desde: requisito.slug, hasta: materia.slug, tipo, exigencia });
  };

  for (const m of todas) {
    for (const id of m.correlativas.paraCursar.regularizadas) agregar(m, id, 'cursar', 'regularizada');
    for (const id of m.correlativas.paraCursar.aprobadas) agregar(m, id, 'cursar', 'aprobada');
    for (const id of m.correlativas.paraRendir.aprobadas) agregar(m, id, 'rendir', 'aprobada');
  }

  const requisitos = agrupar(aristas, (a) => a.hasta);
  const dependientes = agrupar(aristas, (a) => a.desde);

  return {
    plan,
    materias,
    electivas,
    todas,
    porSlug,
    porId,
    aristas,
    requisitos,
    dependientes,
    referenciasRotas,
  };
}

function agrupar(
  aristas: readonly Arista[],
  clave: (a: Arista) => string,
): ReadonlyMap<string, readonly Arista[]> {
  const mapa = new Map<string, Arista[]>();
  for (const a of aristas) {
    const k = clave(a);
    const lista = mapa.get(k);
    if (lista === undefined) mapa.set(k, [a]);
    else lista.push(a);
  }
  return mapa;
}

let cache: Grafo | null = null;

/** Grafo del plan oficial, construido una sola vez por proceso. */
export function grafoPorDefecto(): Grafo {
  cache ??= construirGrafo(PLAN);
  return cache;
}

/** Busca una materia por slug. Tira si no existe: es un bug de programación. */
export function materiaDe(grafo: Grafo, slug: string): Materia {
  const m = grafo.porSlug.get(slug);
  if (m === undefined) throw new Error(`No existe la materia con slug "${slug}"`);
  return m;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASIFICACIÓN DE MATERIAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ¿La materia rinde final?
 * La PPS (`tipo: 'practica'`) no: se acredita con las 200 hs cumplidas.
 */
export function tieneFinal(materia: Materia): boolean {
  return materia.tipo !== 'practica';
}

/**
 * ¿Forma parte de la carrera de Ingeniería?
 * Excluye las electivas (se cuentan por horas, no por materia) y el Seminario
 * Integrador, que es exclusivo del título intermedio.
 */
export function esDeIngenieria(materia: Materia): boolean {
  return materia.tipo !== 'electiva' && materia.id !== ID_SEMINARIO_INTEGRADOR;
}

/** Las 36 asignaturas obligatorias: Ingeniería sin la PPS. */
export function esAsignaturaObligatoria(materia: Materia): boolean {
  return esDeIngenieria(materia) && materia.id !== ID_PPS;
}

/**
 * ¿Va al mapa principal?
 * Todas las del plan (incluido el Seminario Integrador) menos las electivas,
 * que se eligen por horas y tienen su propia vista.
 */
export function esDelPlan(materia: Materia): boolean {
  return materia.tipo !== 'electiva';
}

// ─────────────────────────────────────────────────────────────────────────────
// LOS DOS EJES: CURSAR Y RENDIR
// ─────────────────────────────────────────────────────────────────────────────

function cumple(
  grafo: Grafo,
  progreso: Progreso,
  idRequisito: number,
  exigencia: Exigencia,
): boolean {
  const requisito = grafo.porId.get(idRequisito);
  // Referencia rota → falla cerrado. El validador de la Fase 1 lo reporta como
  // error para que nunca lleguemos acá en producción.
  if (requisito === undefined) return false;
  return exigencia === 'aprobada'
    ? estaAprobada(progreso, requisito.slug)
    : estaRegularizada(progreso, requisito.slug);
}

/**
 * ¿Puede **inscribirse a cursar** la materia?
 *
 * Cumple si las de `paraCursar.regularizadas` están `regular` o `aprobada`,
 * y las de `paraCursar.aprobadas` tienen el final aprobado.
 *
 * No mira el estado propio de la materia: una materia ya aprobada devuelve
 * `true` si sus correlativas siguen cumplidas.
 */
export function puedeCursar(materia: Materia, progreso: Progreso, grafo: Grafo): boolean {
  const { regularizadas, aprobadas } = materia.correlativas.paraCursar;
  return (
    regularizadas.every((id) => cumple(grafo, progreso, id, 'regularizada')) &&
    aprobadas.every((id) => cumple(grafo, progreso, id, 'aprobada'))
  );
}

/**
 * ¿Puede **rendir el final** de la materia?
 *
 * Exige DOS cosas: que la materia esté `regular` (tiene la cursada y adeuda el
 * final) y que todas las de `paraRendir.aprobadas` tengan su final aprobado.
 *
 * Devuelve `false` para la PPS, que no rinde final.
 */
export function puedeRendirFinal(materia: Materia, progreso: Progreso, grafo: Grafo): boolean {
  if (!tieneFinal(materia)) return false;
  if (estadoDe(progreso, materia.slug) !== 'regular') return false;
  return materia.correlativas.paraRendir.aprobadas.every((id) =>
    cumple(grafo, progreso, id, 'aprobada'),
  );
}

/**
 * Estado visual derivado de la materia.
 *
 * - `cursando` / `aprobada` → `disponible` (ya está adentro; el color de la
 *   tarjeta lo define el `estado`, no la habilitación).
 * - `regular` → `final-habilitado` o `final-bloqueado`.
 * - `pendiente` / `recursa` → `disponible` o `bloqueada` según correlativas.
 */
export function getHabilitacion(materia: Materia, progreso: Progreso, grafo: Grafo): Habilitacion {
  const estado = estadoDe(progreso, materia.slug);

  if (estado === 'aprobada' || estado === 'cursando') return 'disponible';

  if (estado === 'regular') {
    // La PPS se acredita, no rinde: nunca queda "esperando final".
    if (!tieneFinal(materia)) return 'disponible';
    return puedeRendirFinal(materia, progreso, grafo) ? 'final-habilitado' : 'final-bloqueado';
  }

  return puedeCursar(materia, progreso, grafo) ? 'disponible' : 'bloqueada';
}

/** Correlativas incumplidas de una materia, con el motivo de cada una. */
export function requisitosFaltantes(
  materia: Materia,
  progreso: Progreso,
  grafo: Grafo,
): RequisitoFaltante[] {
  const faltantes: RequisitoFaltante[] = [];

  const revisar = (ids: readonly number[], para: TipoArista, exigencia: Exigencia): void => {
    for (const id of ids) {
      if (cumple(grafo, progreso, id, exigencia)) continue;
      const req = grafo.porId.get(id);
      if (req === undefined) continue; // referencia rota: la reporta el validador
      faltantes.push({ materia: req, para, exigencia, estadoActual: estadoDe(progreso, req.slug) });
    }
  };

  revisar(materia.correlativas.paraCursar.regularizadas, 'cursar', 'regularizada');
  revisar(materia.correlativas.paraCursar.aprobadas, 'cursar', 'aprobada');
  if (tieneFinal(materia)) {
    revisar(materia.correlativas.paraRendir.aprobadas, 'rendir', 'aprobada');
  }

  return faltantes;
}

/** Todo lo derivado de una materia, de una sola pasada. */
export function derivar(materia: Materia, progreso: Progreso, grafo: Grafo): MateriaDerivada {
  const estado = estadoDe(progreso, materia.slug);
  const cursable = puedeCursar(materia, progreso, grafo);
  const rendible = puedeRendirFinal(materia, progreso, grafo);
  const yaEmpezada = estado === 'cursando' || estado === 'regular' || estado === 'aprobada';

  return {
    materia,
    estado,
    puedeCursar: cursable,
    puedeRendirFinal: rendible,
    habilitacion: getHabilitacion(materia, progreso, grafo),
    faltaFinalCorrelativo: estado === 'regular' && tieneFinal(materia) && !rendible,
    requisitosFaltantes: requisitosFaltantes(materia, progreso, grafo),
    inconsistente: yaEmpezada && !cursable,
  };
}

/** Deriva todas las materias del grafo. Un solo cálculo por cambio de progreso. */
export function derivarTodas(progreso: Progreso, grafo: Grafo): Map<string, MateriaDerivada> {
  const mapa = new Map<string, MateriaDerivada>();
  for (const m of grafo.todas) mapa.set(m.slug, derivar(m, progreso, grafo));
  return mapa;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOPOLOGÍA: QUIÉN DEPENDE DE QUIÉN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Correlativas directas de una materia.
 * Por defecto solo las de **cursar**: el grafo de "rendir" incluye a todas las
 * previas del Proyecto Final y satura la vista.
 */
export function requisitosDirectos(
  slug: string,
  grafo: Grafo,
  tipos: readonly TipoArista[] = TIPOS_CURSAR,
): Arista[] {
  return (grafo.requisitos.get(slug) ?? []).filter((a) => tipos.includes(a.tipo));
}

/** Materias que tienen a `slug` como correlativa directa. */
export function desbloqueaDirectamente(
  slug: string,
  grafo: Grafo,
  tipos: readonly TipoArista[] = TIPOS_CURSAR,
): Arista[] {
  return (grafo.dependientes.get(slug) ?? []).filter((a) => tipos.includes(a.tipo));
}

function recorrer(
  slug: string,
  grafo: Grafo,
  tipos: readonly TipoArista[],
  direccion: 'arriba' | 'abajo',
): Set<string> {
  const visitados = new Set<string>();
  const pila: string[] = [slug];

  while (pila.length > 0) {
    const actual = pila.pop();
    if (actual === undefined) break;
    const aristas =
      direccion === 'arriba'
        ? (grafo.requisitos.get(actual) ?? [])
        : (grafo.dependientes.get(actual) ?? []);

    for (const a of aristas) {
      if (!tipos.includes(a.tipo)) continue;
      const vecino = direccion === 'arriba' ? a.desde : a.hasta;
      if (visitados.has(vecino) || vecino === slug) continue;
      visitados.add(vecino);
      pila.push(vecino);
    }
  }

  return visitados;
}

/**
 * Todos los requisitos **transitivos** de una materia.
 * Es lo que se resalta como "· Requisito" al seleccionar un nodo (§4.6).
 */
export function ancestros(
  slug: string,
  grafo: Grafo,
  tipos: readonly TipoArista[] = TIPOS_CURSAR,
): Set<string> {
  return recorrer(slug, grafo, tipos, 'arriba');
}

/**
 * Todo lo que la materia habilita **en cadena**.
 * Es lo que se resalta como "· Desbloquea materia" al seleccionar un nodo.
 */
export function descendientes(
  slug: string,
  grafo: Grafo,
  tipos: readonly TipoArista[] = TIPOS_CURSAR,
): Set<string> {
  return recorrer(slug, grafo, tipos, 'abajo');
}

/**
 * Materias hoy **bloqueadas** que pasarían a estar disponibles si el
 * estudiante aprobara esta materia y siguiera la cadena hacia abajo.
 *
 * Alimenta la caja `MATERIA PRIORITARIA` del panel de selección (§4.5):
 * *"Desbloquea 21 materias en cadena para tu progreso actual"*.
 *
 * La simulación es **optimista pero honesta**: aprueba la materia elegida y
 * después, en cascada, solo las descendientes que van quedando habilitadas.
 * Nunca aprueba requisitos ajenos a la cadena, así que una materia que además
 * depende de algo que el estudiante no tiene NO se cuenta.
 */
export function desbloqueaEnCadena(slug: string, progreso: Progreso, grafo: Grafo): string[] {
  const descendencia = descendientes(slug, grafo, TIPOS_CURSAR);
  if (descendencia.size === 0) return [];

  const bloqueadasHoy = [...descendencia].filter(
    (s) => getHabilitacion(materiaDe(grafo, s), progreso, grafo) === 'bloqueada',
  );
  if (bloqueadasHoy.length === 0) return [];

  const simulado: Record<string, RegistroProgreso> = { ...progreso, [slug]: { estado: 'aprobada' } };
  let hubocambio = true;
  while (hubocambio) {
    hubocambio = false;
    for (const s of descendencia) {
      if (simulado[s]?.estado === 'aprobada') continue;
      if (puedeCursar(materiaDe(grafo, s), simulado, grafo)) {
        simulado[s] = { estado: 'aprobada' };
        hubocambio = true;
      }
    }
  }

  return bloqueadasHoy
    .filter((s) => puedeCursar(materiaDe(grafo, s), simulado, grafo))
    .sort((a, b) => ordenDePlan(grafo, a) - ordenDePlan(grafo, b));
}

/**
 * Clave de orden "como está en el plan": primero por nivel, después por N°.
 * Las electivas comparten `id: 0`, así que caen al principio de su nivel.
 */
function ordenDePlan(grafo: Grafo, slug: string): number {
  const m = grafo.porSlug.get(slug);
  if (m === undefined) return Number.MAX_SAFE_INTEGER;
  return m.nivel * 1000 + m.id;
}

/**
 * Subgrafo que se resalta al seleccionar un nodo (§4.6).
 *
 * `requisitos` son los ancestros transitivos ("qué necesito antes") y
 * `desbloquea` los descendientes ("qué me abre esto"). Todo lo que no esté en
 * `relacionadas` se atenúa al 25 %.
 */
export interface Resaltado {
  seleccionada: string;
  requisitos: ReadonlySet<string>;
  desbloquea: ReadonlySet<string>;
  /** `requisitos ∪ desbloquea ∪ { seleccionada }` */
  relacionadas: ReadonlySet<string>;
}

export function calcularResaltado(
  slug: string,
  grafo: Grafo,
  tipos: readonly TipoArista[] = TIPOS_CURSAR,
): Resaltado {
  const requisitos = ancestros(slug, grafo, tipos);
  const desbloquea = descendientes(slug, grafo, tipos);
  return {
    seleccionada: slug,
    requisitos,
    desbloquea,
    relacionadas: new Set<string>([slug, ...requisitos, ...desbloquea]),
  };
}

/**
 * Detecta ciclos en el grafo. Si devuelve algo distinto de `[]`, el dataset
 * está roto: el árbol de correlativas tiene que ser un DAG.
 * Cada ciclo se devuelve como la lista de slugs que lo forman.
 */
export function detectarCiclos(
  grafo: Grafo,
  tipos: readonly TipoArista[] = ['cursar', 'rendir'],
): string[][] {
  const ciclos: string[][] = [];
  const estado = new Map<string, 'visitando' | 'listo'>();
  const camino: string[] = [];

  const visitar = (slug: string): void => {
    estado.set(slug, 'visitando');
    camino.push(slug);

    for (const a of grafo.dependientes.get(slug) ?? []) {
      if (!tipos.includes(a.tipo)) continue;
      const siguiente = a.hasta;
      const marca = estado.get(siguiente);
      if (marca === 'visitando') {
        const inicio = camino.indexOf(siguiente);
        ciclos.push(camino.slice(inicio === -1 ? 0 : inicio).concat(siguiente));
      } else if (marca === undefined) {
        visitar(siguiente);
      }
    }

    camino.pop();
    estado.set(slug, 'listo');
  };

  for (const m of grafo.todas) {
    if (!estado.has(m.slug)) visitar(m.slug);
  }

  return ciclos;
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTADÍSTICAS
// ─────────────────────────────────────────────────────────────────────────────

export interface Estadisticas {
  /** Las 36 obligatorias + la PPS. No incluye electivas ni Seminario Integrador. */
  total: number;
  aprobadas: number;
  cursando: number;
  /** Adeuda final. */
  regulares: number;
  recursa: number;
  pendientes: number;
  /** `total - aprobadas`. */
  restantes: number;
  /** 0–100, con un decimal. */
  porcentaje: number;
  disponibles: number;
  bloqueadas: number;
  finalesHabilitados: number;
  finalesBloqueados: number;
  /** Materias marcadas como cursadas/aprobadas sin cumplir las correlativas. */
  inconsistentes: number;
  horas: {
    /** Horas de materias con el final aprobado. */
    aprobadas: number;
    /** Horas de las 36 + PPS (3.312 + 200). */
    totales: number;
  };
}

/**
 * Contadores del panel de estadísticas (§4.4), sobre la carrera de Ingeniería:
 * las 36 obligatorias + la PPS. Las electivas se miden en horas aparte y el
 * Seminario Integrador solo cuenta para el título intermedio.
 */
export function estadisticas(progreso: Progreso, grafo: Grafo): Estadisticas {
  const materias = grafo.materias.filter(esDeIngenieria);

  let aprobadas = 0;
  let cursando = 0;
  let regulares = 0;
  let recursa = 0;
  let pendientes = 0;
  let disponibles = 0;
  let bloqueadas = 0;
  let finalesHabilitados = 0;
  let finalesBloqueados = 0;
  let inconsistentes = 0;
  let horasAprobadas = 0;
  let horasTotales = 0;

  for (const m of materias) {
    const d = derivar(m, progreso, grafo);
    horasTotales += m.horasTotales;

    switch (d.estado) {
      case 'aprobada':
        aprobadas += 1;
        horasAprobadas += m.horasTotales;
        break;
      case 'cursando':
        cursando += 1;
        break;
      case 'regular':
        regulares += 1;
        break;
      case 'recursa':
        recursa += 1;
        break;
      case 'pendiente':
        pendientes += 1;
        break;
    }

    switch (d.habilitacion) {
      case 'disponible':
        // Solo cuentan como "disponibles" las que todavía no arrancó.
        if (d.estado === 'pendiente' || d.estado === 'recursa') disponibles += 1;
        break;
      case 'bloqueada':
        bloqueadas += 1;
        break;
      case 'final-habilitado':
        finalesHabilitados += 1;
        break;
      case 'final-bloqueado':
        finalesBloqueados += 1;
        break;
    }

    if (d.inconsistente) inconsistentes += 1;
  }

  const total = materias.length;

  return {
    total,
    aprobadas,
    cursando,
    regulares,
    recursa,
    pendientes,
    restantes: total - aprobadas,
    porcentaje: porcentaje(aprobadas, total),
    disponibles,
    bloqueadas,
    finalesHabilitados,
    finalesBloqueados,
    inconsistentes,
    horas: { aprobadas: horasAprobadas, totales: horasTotales },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ELECTIVAS: SE CUENTAN HORAS, NO MATERIAS
// ─────────────────────────────────────────────────────────────────────────────

export type NivelElectiva = 3 | 4 | 5;

export interface RequisitoElectivasNivel {
  nivel: NivelElectiva;
  /** Horas exigidas por la Ord. 1877: 96 / 144 / 240. */
  requeridas: number;
  /** Horas con el final aprobado. Son las que cuentan. */
  aprobadas: number;
  /** Horas en materias `cursando` o `regular`: todavía no suman. */
  enProgreso: number;
  cumple: boolean;
  /** 0–100 con un decimal, topeado en 100. */
  porcentaje: number;
}

export interface ResumenElectivas {
  porNivel: Record<NivelElectiva, RequisitoElectivasNivel>;
  totalRequeridas: number;
  totalAprobadas: number;
  totalEnProgreso: number;
  /** Cumple los TRES niveles. Ojo: las horas de más de un nivel no compensan a otro. */
  cumpleTodo: boolean;
  porcentaje: number;
}

/**
 * Horas de electivas acumuladas por nivel contra lo que exige la Ord. 1877
 * (96 hs en nivel 3 + 144 en nivel 4 + 240 en nivel 5 = 480).
 *
 * **No alcanza con "aprobar N electivas"**: el requisito es por horas Y por
 * nivel. Un excedente de nivel 5 no cubre el faltante de nivel 3.
 */
export function horasElectivasPorNivel(progreso: Progreso, grafo: Grafo): ResumenElectivas {
  const req = grafo.plan.requisitoElectivas;
  const requeridasPorNivel: Record<NivelElectiva, number> = {
    3: req.nivel3,
    4: req.nivel4,
    5: req.nivel5,
  };

  const aprobadas: Record<NivelElectiva, number> = { 3: 0, 4: 0, 5: 0 };
  const enProgreso: Record<NivelElectiva, number> = { 3: 0, 4: 0, 5: 0 };

  for (const e of grafo.electivas) {
    if (e.nivel !== 3 && e.nivel !== 4 && e.nivel !== 5) continue;
    const nivel: NivelElectiva = e.nivel;
    const estado = estadoDe(progreso, e.slug);
    if (estado === 'aprobada') aprobadas[nivel] += e.horasTotales;
    else if (estado === 'cursando' || estado === 'regular') enProgreso[nivel] += e.horasTotales;
  }

  const porNivel = {} as Record<NivelElectiva, RequisitoElectivasNivel>;
  for (const nivel of [3, 4, 5] as const) {
    const requeridas = requeridasPorNivel[nivel];
    const hs = aprobadas[nivel];
    porNivel[nivel] = {
      nivel,
      requeridas,
      aprobadas: hs,
      enProgreso: enProgreso[nivel],
      cumple: hs >= requeridas,
      porcentaje: Math.min(100, porcentaje(hs, requeridas)),
    };
  }

  const totalAprobadas = aprobadas[3] + aprobadas[4] + aprobadas[5];
  // Para el % global topeamos por nivel: 300 hs de nivel 5 no tapan 0 de nivel 3.
  const acreditadas =
    Math.min(aprobadas[3], requeridasPorNivel[3]) +
    Math.min(aprobadas[4], requeridasPorNivel[4]) +
    Math.min(aprobadas[5], requeridasPorNivel[5]);

  return {
    porNivel,
    totalRequeridas: req.total,
    totalAprobadas,
    totalEnProgreso: enProgreso[3] + enProgreso[4] + enProgreso[5],
    cumpleTodo: porNivel[3].cumple && porNivel[4].cumple && porNivel[5].cumple,
    porcentaje: porcentaje(acreditadas, req.total),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TÍTULO INTERMEDIO
// ─────────────────────────────────────────────────────────────────────────────

export interface ProgresoTitulo {
  nombre: string;
  /** 24: las materias 1..23 del plan + Seminario Integrador. */
  total: number;
  aprobadas: number;
  restantes: number;
  porcentaje: number;
  completo: boolean;
  /** Slugs de lo que falta aprobar, en orden de plan. */
  faltantes: string[];
}

/**
 * Avance hacia el título de **Analista Desarrollador/a Universitario/a de
 * Sistemas de Información** (Ord. CS N° 1910): materias 1 a 23 + Seminario
 * Integrador. Merece su propio anillo en el panel (§4.4): para la mayoría es
 * el hito más motivador del mapa, y llega al 100 % con la carrera en ~60 %.
 */
export function progresoTituloIntermedio(progreso: Progreso, grafo: Grafo): ProgresoTitulo {
  const { nombre, materias: ids } = grafo.plan.tituloIntermedio;

  const requeridas = ids
    .map((id) => grafo.porId.get(id))
    .filter((m): m is Materia => m !== undefined);

  const faltantes = requeridas.filter((m) => !estaAprobada(progreso, m.slug)).map((m) => m.slug);
  const aprobadas = requeridas.length - faltantes.length;

  return {
    nombre,
    total: requeridas.length,
    aprobadas,
    restantes: faltantes.length,
    porcentaje: porcentaje(aprobadas, requeridas.length),
    completo: faltantes.length === 0,
    faltantes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────

/** Porcentaje 0–100 con un decimal. `porcentaje(1, 3) === 33.3` */
export function porcentaje(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((parte / total) * 1000) / 10;
}
