/**
 * ============================================================================
 *  PRÓXIMOS FINALES
 * ============================================================================
 *
 *  Cruza el calendario de mesas con el avance cargado para responder dos
 *  preguntas: **cuándo es la próxima mesa** y **qué final conviene rendir**.
 *
 *  Funciones puras: la fecha "de hoy" entra siempre por parámetro. Además de
 *  hacerlas testeables, evita que el resultado dependa del reloj del cliente en
 *  el medio de un render.
 * ============================================================================
 */

import type { Materia } from '../data/plan-utn-frt-isi-2023';
import { HORA_CIERRE_INSCRIPCION, MESAS, type Mesa } from '../data/mesas-2026';
import { derivar, esDelPlan, tieneFinal, type Grafo } from './grafo';
import { estadoDe, marcar } from './progreso';
import type { Progreso } from './tipos';

// ─────────────────────────────────────────────────────────────────────────────
// FECHAS
// ─────────────────────────────────────────────────────────────────────────────

const MS_POR_DIA = 86_400_000;

/**
 * `YYYY-MM-DD` → medianoche **local**.
 *
 * A propósito no usamos `new Date(iso)`: eso parsea como UTC y en Argentina
 * (UTC-3) devuelve el día anterior a las 21:00, corriendo todos los contadores
 * un día.
 */
export function parsearFecha(iso: string): Date {
  const partes = iso.split('-').map(Number);
  const [anio, mes, dia] = [partes[0] ?? 0, partes[1] ?? 1, partes[2] ?? 1];
  return new Date(anio, mes - 1, dia);
}

/** Días calendario entre dos fechas, ignorando la hora. Puede dar negativo. */
export function diasEntre(desde: Date, hasta: Date): number {
  const a = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate()).getTime();
  const b = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate()).getTime();
  return Math.round((b - a) / MS_POR_DIA);
}

/** Momento exacto en que cierra la inscripción: 15:00 del día de cierre. */
export function momentoDeCierre(mesa: Mesa): Date {
  const dia = parsearFecha(mesa.cierre);
  dia.setHours(HORA_CIERRE_INSCRIPCION, 0, 0, 0);
  return dia;
}

// ─────────────────────────────────────────────────────────────────────────────
// MESAS
// ─────────────────────────────────────────────────────────────────────────────

export type EstadoMesa = 'inscripcion-abierta' | 'inscripcion-cerrada' | 'pasada';

export interface MesaDerivada extends Mesa {
  estado: EstadoMesa;
  /** Días hasta el cierre de inscripción. Negativo si ya cerró. */
  diasHastaCierre: number;
  /** Días hasta el examen. Negativo si ya pasó. */
  diasHastaExamen: number;
}

export function derivarMesa(mesa: Mesa, ahora: Date): MesaDerivada {
  const cierre = momentoDeCierre(mesa);
  const examen = parsearFecha(mesa.examen);

  const yaPasoElExamen = diasEntre(ahora, examen) < 0;
  const yaCerroLaInscripcion = ahora.getTime() > cierre.getTime();

  return {
    ...mesa,
    estado: yaPasoElExamen
      ? 'pasada'
      : yaCerroLaInscripcion
        ? 'inscripcion-cerrada'
        : 'inscripcion-abierta',
    diasHastaCierre: diasEntre(ahora, cierre),
    diasHastaExamen: diasEntre(ahora, examen),
  };
}

/** Mesas cuyo examen todavía no pasó, en orden cronológico. */
export function mesasPendientes(ahora: Date, mesas: readonly Mesa[] = MESAS): MesaDerivada[] {
  return mesas
    .map((m) => derivarMesa(m, ahora))
    .filter((m) => m.estado !== 'pasada')
    .sort((a, b) => a.diasHastaExamen - b.diasHastaExamen);
}

export interface LlamadoDerivado {
  llamado: number;
  mesas: MesaDerivada[];
  /** La mesa más próxima del llamado que todavía admite inscripción. */
  proximaAbierta: MesaDerivada | null;
}

/** Agrupa las mesas pendientes por llamado, manteniendo el orden cronológico. */
export function llamadosPendientes(ahora: Date, mesas: readonly Mesa[] = MESAS): LlamadoDerivado[] {
  const porLlamado = new Map<number, MesaDerivada[]>();

  for (const mesa of mesasPendientes(ahora, mesas)) {
    const lista = porLlamado.get(mesa.llamado);
    if (lista === undefined) porLlamado.set(mesa.llamado, [mesa]);
    else lista.push(mesa);
  }

  return [...porLlamado.entries()]
    .map(([llamado, lista]) => ({
      llamado,
      mesas: lista.sort((a, b) => a.mesa - b.mesa),
      proximaAbierta: lista.find((m) => m.estado === 'inscripcion-abierta') ?? null,
    }))
    .sort((a, b) => a.llamado - b.llamado);
}

// ─────────────────────────────────────────────────────────────────────────────
// QUÉ FINAL CONVIENE RENDIR
// ─────────────────────────────────────────────────────────────────────────────

export interface FinalPendiente {
  materia: Materia;
  /** Está `regular` y cumple todas las correlativas para rendir. */
  puedeRendir: boolean;
  /** Finales que le faltan aprobar. Vacío si `puedeRendir`. */
  faltan: Materia[];
  /** Materias hoy bloqueadas que se destrabarían al aprobar este final. */
  desbloqueaCursadas: Materia[];
  /** Materias `regular` que pasarían a poder rendir su propio final. */
  destrabaFinales: Materia[];
  /** `desbloqueaCursadas + destrabaFinales`. Es el criterio de orden. */
  impacto: number;
}

/**
 * Todos los finales que el estudiante adeuda, ordenados por conveniencia.
 *
 * El impacto se calcula **sin cascada**: mide solo lo que se destraba al
 * aprobar ESE final, no lo que se destrabaría si además aprobara todo lo que
 * viene después. Es la diferencia entre "rendí esto y la semana que viene te
 * anotás a tres materias más" y una promesa que depende de otros cinco finales.
 */
export function finalesPendientes(progreso: Progreso, grafo: Grafo): FinalPendiente[] {
  const adeudados = grafo.todas.filter(
    (m) => tieneFinal(m) && estadoDe(progreso, m.slug) === 'regular',
  );

  const pendientes = adeudados.map((materia) => {
    const derivada = derivar(materia, progreso, grafo);

    // Simulamos aprobar SOLO este final y vemos qué cambia.
    const simulado = marcar(progreso, materia.slug, 'aprobada');

    const desbloqueaCursadas: Materia[] = [];
    const destrabaFinales: Materia[] = [];

    for (const otra of grafo.todas) {
      if (otra.slug === materia.slug) continue;
      const antes = derivar(otra, progreso, grafo).habilitacion;
      const despues = derivar(otra, simulado, grafo).habilitacion;
      if (antes === despues) continue;

      if (antes === 'bloqueada' && despues === 'disponible') desbloqueaCursadas.push(otra);
      if (antes === 'final-bloqueado' && despues === 'final-habilitado') destrabaFinales.push(otra);
    }

    return {
      materia,
      puedeRendir: derivada.puedeRendirFinal,
      faltan: derivada.requisitosFaltantes.filter((r) => r.para === 'rendir').map((r) => r.materia),
      desbloqueaCursadas,
      destrabaFinales,
      impacto: desbloqueaCursadas.length + destrabaFinales.length,
    };
  });

  return pendientes.sort(comparar);
}

/**
 * Primero lo que se puede rendir ya, después por impacto, y a igualdad por
 * orden de plan. Una materia que no podés rendir nunca va arriba de una que sí,
 * por mucho que destrabe: la lista tiene que ser accionable.
 */
function comparar(a: FinalPendiente, b: FinalPendiente): number {
  if (a.puedeRendir !== b.puedeRendir) return a.puedeRendir ? -1 : 1;
  if (a.impacto !== b.impacto) return b.impacto - a.impacto;
  if (a.materia.nivel !== b.materia.nivel) return a.materia.nivel - b.materia.nivel;
  return a.materia.id - b.materia.id;
}

export interface ResumenFinales {
  /** Los que podés rendir ya, ordenados por impacto. */
  habilitados: FinalPendiente[];
  /** Los que adeudás pero tienen un final correlativo pendiente. */
  bloqueados: FinalPendiente[];
  /** El de mayor impacto entre los habilitados, si alguno destraba algo. */
  prioritario: FinalPendiente | null;
}

export function resumenDeFinales(progreso: Progreso, grafo: Grafo): ResumenFinales {
  const todos = finalesPendientes(progreso, grafo).filter((f) => esDelPlan(f.materia));
  const habilitados = todos.filter((f) => f.puedeRendir);
  const bloqueados = todos.filter((f) => !f.puedeRendir);
  const primero = habilitados[0];

  return {
    habilitados,
    bloqueados,
    prioritario: primero !== undefined && primero.impacto > 0 ? primero : null,
  };
}
