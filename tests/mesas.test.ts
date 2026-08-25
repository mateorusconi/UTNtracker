/**
 * Calendario de mesas y priorización de finales.
 *
 * La fecha "de hoy" entra siempre por parámetro: sin eso, los tests dependerían
 * del reloj de la máquina y se pondrían rojos solos el día equivocado.
 */

import { describe, expect, it } from 'vitest';

import { MESAS } from '../src/data/mesas-2026';
import { ASIGNACIONES, SIN_MESA_PUBLICADA } from '../src/data/mesas-materias';
import {
  asignacionDe,
  derivarMesa,
  diasEntre,
  finalesPendientes,
  llamadosPendientes,
  mesasPendientes,
  momentoDeCierre,
  parsearFecha,
  proximaOportunidad,
  resumenDeFinales,
} from '../src/lib/mesas';
import { aprobadas, combinar, grafo, materia, regulares, slug } from './ayudas';

describe('fechas', () => {
  it('parsea en horario local, no en UTC', () => {
    // `new Date('2026-05-07')` daría el 6 a las 21:00 en Argentina (UTC-3) y
    // correría todos los contadores un día.
    const fecha = parsearFecha('2026-05-07');

    expect(fecha.getFullYear()).toBe(2026);
    expect(fecha.getMonth()).toBe(4); // mayo
    expect(fecha.getDate()).toBe(7);
    expect(fecha.getHours()).toBe(0);
  });

  it('cuenta días calendario, sin importar la hora', () => {
    const lunes = new Date(2026, 8, 1, 23, 30);
    const martes = new Date(2026, 8, 2, 0, 15);

    expect(diasEntre(lunes, martes)).toBe(1);
    expect(diasEntre(martes, lunes)).toBe(-1);
    expect(diasEntre(lunes, lunes)).toBe(0);
  });

  it('la inscripción cierra a las 15:00 del día de cierre', () => {
    const cierre = momentoDeCierre({ llamado: 4, mesa: 1, cierre: '2026-09-07', examen: '2026-09-09' });

    expect(cierre.getDate()).toBe(7);
    expect(cierre.getHours()).toBe(15);
  });
});

describe('estado de una mesa', () => {
  const mesa = { llamado: 4, mesa: 1, cierre: '2026-09-07', examen: '2026-09-09' } as const;

  it('con inscripción abierta cuenta los días que faltan', () => {
    const d = derivarMesa(mesa, new Date(2026, 8, 1, 10, 0));

    expect(d.estado).toBe('inscripcion-abierta');
    expect(d.diasHastaCierre).toBe(6);
    expect(d.diasHastaExamen).toBe(8);
  });

  it('a las 14:59 del día de cierre todavía se puede anotar', () => {
    expect(derivarMesa(mesa, new Date(2026, 8, 7, 14, 59)).estado).toBe('inscripcion-abierta');
  });

  it('a las 15:01 ya cerró, pero la mesa sigue por rendirse', () => {
    const d = derivarMesa(mesa, new Date(2026, 8, 7, 15, 1));

    expect(d.estado).toBe('inscripcion-cerrada');
    expect(d.diasHastaExamen).toBe(2);
  });

  it('el día del examen todavía no está pasada', () => {
    expect(derivarMesa(mesa, new Date(2026, 8, 9, 9, 0)).estado).not.toBe('pasada');
  });

  it('al día siguiente del examen queda pasada', () => {
    expect(derivarMesa(mesa, new Date(2026, 8, 10, 9, 0)).estado).toBe('pasada');
  });
});

describe('calendario 2026', () => {
  it('tiene 10 llamados de 3 mesas', () => {
    expect(MESAS).toHaveLength(30);
    expect(new Set(MESAS.map((m) => m.llamado)).size).toBe(10);
  });

  it('en toda mesa el cierre es anterior al examen', () => {
    for (const mesa of MESAS) {
      expect(parsearFecha(mesa.cierre).getTime()).toBeLessThan(parsearFecha(mesa.examen).getTime());
    }
  });

  it('los llamados 8, 9 y 10 se rinden en 2027 aunque sean del ciclo 2026', () => {
    const tardios = MESAS.filter((m) => m.llamado >= 8);

    expect(tardios).toHaveLength(9);
    for (const mesa of tardios) {
      expect(parsearFecha(mesa.examen).getFullYear()).toBe(2027);
    }
  });

  it('descarta las mesas ya rendidas y ordena por fecha de examen', () => {
    const pendientes = mesasPendientes(new Date(2026, 8, 1));

    expect(pendientes[0]?.llamado).toBe(4);
    expect(pendientes.every((m) => m.diasHastaExamen >= 0)).toBe(true);
    for (let i = 1; i < pendientes.length; i += 1) {
      const anterior = pendientes[i - 1];
      const actual = pendientes[i];
      if (anterior === undefined || actual === undefined) continue;
      expect(actual.diasHastaExamen).toBeGreaterThanOrEqual(anterior.diasHastaExamen);
    }
  });

  it('agrupa por llamado y señala la próxima mesa con inscripción abierta', () => {
    const llamados = llamadosPendientes(new Date(2026, 8, 1));

    expect(llamados[0]?.llamado).toBe(4);
    expect(llamados[0]?.mesas.map((m) => m.mesa)).toEqual([1, 2, 3]);
    expect(llamados[0]?.proximaAbierta?.mesa).toBe(1);
    // En septiembre ya no queda nada de los tres primeros llamados.
    expect(llamados.some((l) => l.llamado <= 3)).toBe(false);
  });

  it('en pleno diciembre el próximo llamado ya es de 2027', () => {
    const llamados = llamadosPendientes(new Date(2026, 11, 20));
    expect(llamados[0]?.llamado).toBe(8);
  });
});

describe('en qué mesa se rinde cada materia', () => {
  it('distingue lo que coincide por nombre de lo que interpretamos', () => {
    // "Analisis Matematico II" coincide tal cual con el Plan 2023.
    const exacta = asignacionDe(materia(9));
    expect(exacta?.mesa).toBe(3);
    expect(exacta?.confianza).toBe('exacta');

    // "Gestion de Datos" es el nombre del Plan 2008: lo leímos como Bases de Datos.
    const interpretada = asignacionDe(materia(19));
    expect(interpretada?.mesa).toBe(1);
    expect(interpretada?.confianza).toBe('interpretada');
    expect(interpretada?.comoFigura).toBe('Gestion de Datos');
  });

  it('devuelve null para las materias que el listado no incluye', () => {
    for (const id of SIN_MESA_PUBLICADA) {
      expect(asignacionDe(materia(id))).toBeNull();
    }
  });

  it('ninguna materia está en dos mesas', () => {
    const claves = ASIGNACIONES.map((a) => a.materia);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it('toda asignación apunta a una materia que existe en el plan', () => {
    for (const a of ASIGNACIONES) {
      const existe =
        typeof a.materia === 'number'
          ? grafo.porId.has(a.materia)
          : grafo.porSlug.has(a.materia);
      expect(existe, `${a.materia} (${a.comoFigura})`).toBe(true);
    }
  });

  it('la próxima oportunidad prefiere una mesa con inscripción abierta', () => {
    // 1 de septiembre: el 4° llamado está abierto entero.
    const o = proximaOportunidad(materia(9), new Date(2026, 8, 1));

    expect(o?.mesa.llamado).toBe(4);
    expect(o?.mesa.mesa).toBe(3); // Análisis Matemático II va en la Mesa 3
    expect(o?.inscripcionAbierta).toBe(true);
    expect(o?.diasParaEstudiar).toBe(24); // examen 25/09
  });

  it('si la inscripción de la mesa ya cerró, salta al llamado siguiente', () => {
    // 23 de septiembre: la Mesa 3 del 4° llamado cerró el 22.
    const o = proximaOportunidad(materia(9), new Date(2026, 8, 23, 10));

    expect(o?.mesa.llamado).toBe(5);
    expect(o?.inscripcionAbierta).toBe(true);
  });

  it('sin mesa publicada no hay oportunidad que mostrar', () => {
    expect(proximaOportunidad(materia(20), new Date(2026, 8, 1))).toBeNull();
  });
});

describe('qué final conviene rendir', () => {
  // Adeuda Sintaxis (13) y Bases de Datos (19). Para rendir 19 hace falta el
  // final de 13, así que 13 es el que destraba.
  const progreso = combinar(aprobadas(5, 6, 8, 16), regulares(13, 19));

  it('separa lo que se puede rendir de lo que tiene un final correlativo pendiente', () => {
    const resumen = resumenDeFinales(progreso, grafo);

    expect(resumen.habilitados.map((f) => f.materia.id)).toEqual([13]);
    expect(resumen.bloqueados.map((f) => f.materia.id)).toEqual([19]);
    expect(resumen.bloqueados[0]?.faltan.map((m) => m.id)).toEqual([13]);
  });

  it('mide el impacto sin cascada: solo lo que destraba ESE final', () => {
    const [sintaxis] = finalesPendientes(progreso, grafo);

    expect(sintaxis?.materia.id).toBe(13);
    expect(sintaxis?.destrabaFinales.map((m) => m.id)).toEqual([19]);
    expect(sintaxis?.impacto).toBe(1);
  });

  it('marca como prioritario el habilitado que más destraba', () => {
    const resumen = resumenDeFinales(progreso, grafo);
    expect(resumen.prioritario?.materia.id).toBe(13);
  });

  it('sin finales que destraben nada, no hay prioritario', () => {
    // Análisis Matemático II regular, con 1 y 2 aprobadas: se puede rendir,
    // pero aprobarlo no habilita nada por sí solo.
    const resumen = resumenDeFinales(combinar(aprobadas(1, 2), regulares(9)), grafo);

    expect(resumen.habilitados.map((f) => f.materia.id)).toEqual([9]);
    expect(resumen.prioritario).toBeNull();
  });

  it('la PPS nunca aparece: se acredita, no se rinde', () => {
    const conPps = combinar(regulares(25, 26, 30, 37), aprobadas(12, 20, 23));
    const resumen = resumenDeFinales(conPps, grafo);

    expect(resumen.habilitados.map((f) => f.materia.slug)).not.toContain(slug(37));
    expect(resumen.bloqueados.map((f) => f.materia.slug)).not.toContain(slug(37));
  });

  it('sin nada cargado, no hay finales pendientes', () => {
    const resumen = resumenDeFinales({}, grafo);

    expect(resumen.habilitados).toEqual([]);
    expect(resumen.bloqueados).toEqual([]);
    expect(resumen.prioritario).toBeNull();
  });
});
