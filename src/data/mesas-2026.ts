/**
 * ============================================================================
 *  MESAS DE EXÁMENES — CICLO LECTIVO 2026
 *  UTN FRT · Secretaría de Asuntos Estudiantiles
 * ============================================================================
 *
 *  Transcripción del calendario oficial. Diez llamados de tres mesas cada uno.
 *
 *  ⚠️ Dos cosas que el calendario aclara y que la app tiene que respetar:
 *
 *   1. El 8°, 9° y 10° llamado **pertenecen al ciclo 2026 pero se rinden en
 *      2027**. Por eso las fechas van con año explícito: si se guardaran solo
 *      como día/mes, el contador de días daría negativo justo cuando más se
 *      necesita.
 *   2. Las inscripciones cierran **a las 15:00** de la fecha de cierre, no a
 *      medianoche. Ver `HORA_CIERRE_INSCRIPCION`.
 *
 *  ⚠️ Lo que este archivo NO tiene: **qué materia se rinde en qué mesa**. El
 *     único listado que circula está escrito con nombres del Plan 2008 (Gestión
 *     de Datos, Matemática Discreta, Sistemas y Organizaciones…) y mapearlo al
 *     2023 sería inventar. Hasta conseguir la distribución en nombres del plan
 *     nuevo, la app muestra los llamados pero no asigna materias a mesas.
 * ============================================================================
 */

export interface Mesa {
  /** Número de llamado, 1 a 10. */
  llamado: number;
  /** Mesa dentro del llamado. */
  mesa: 1 | 2 | 3;
  /** Cierre de inscripción, `YYYY-MM-DD`. Cierra a las 15:00. */
  cierre: string;
  /** Fecha del examen, `YYYY-MM-DD`. */
  examen: string;
}

/** Las inscripciones cierran a las 15 hs de la fecha de cierre. */
export const HORA_CIERRE_INSCRIPCION = 15;

/** Ciclo lectivo al que pertenecen todos estos llamados. */
export const CICLO_LECTIVO = 2026;

const m = (llamado: number, mesa: 1 | 2 | 3, cierre: string, examen: string): Mesa => ({
  llamado,
  mesa,
  cierre,
  examen,
});

export const MESAS: readonly Mesa[] = [
  // ── 2026 ──────────────────────────────────────────────────────────────────
  m(1, 1, '2026-05-07', '2026-05-11'),
  m(1, 2, '2026-05-18', '2026-05-20'),
  m(1, 3, '2026-05-27', '2026-05-29'),

  m(2, 1, '2026-06-05', '2026-06-09'),
  m(2, 2, '2026-06-15', '2026-06-18'),
  m(2, 3, '2026-06-19', '2026-06-23'),

  m(3, 1, '2026-07-30', '2026-08-03'),
  m(3, 2, '2026-08-03', '2026-08-05'),
  m(3, 3, '2026-08-05', '2026-08-07'),

  m(4, 1, '2026-09-07', '2026-09-09'),
  m(4, 2, '2026-09-10', '2026-09-14'),
  m(4, 3, '2026-09-22', '2026-09-25'),

  m(5, 1, '2026-11-18', '2026-11-20'),
  m(5, 2, '2026-11-23', '2026-11-25'),
  m(5, 3, '2026-11-25', '2026-11-27'),

  m(6, 1, '2026-11-30', '2026-12-02'),
  m(6, 2, '2026-12-02', '2026-12-04'),
  m(6, 3, '2026-12-04', '2026-12-09'),

  m(7, 1, '2026-12-10', '2026-12-14'),
  m(7, 2, '2026-12-14', '2026-12-16'),
  m(7, 3, '2026-12-16', '2026-12-18'),

  // ── Del ciclo 2026, pero se rinden en 2027 ────────────────────────────────
  m(8, 1, '2027-02-16', '2027-02-18'),
  m(8, 2, '2027-02-17', '2027-02-21'),
  m(8, 3, '2027-02-21', '2027-02-23'),

  m(9, 1, '2027-02-21', '2027-02-23'),
  m(9, 2, '2027-02-23', '2027-02-25'),
  m(9, 3, '2027-02-24', '2027-02-28'),

  m(10, 1, '2027-03-03', '2027-03-07'),
  m(10, 2, '2027-03-07', '2027-03-09'),
  m(10, 3, '2027-03-09', '2027-03-11'),
];

export default MESAS;
