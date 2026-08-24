/**
 * Criterios de aceptación del §6 del prompt maestro.
 *
 * Estos tests son el contrato del motor: si alguno se pone en rojo, la app
 * le va a mentir a alguien que está por anotarse a una materia.
 */

import { describe, expect, it } from 'vitest';

import {
  derivarTodas,
  desbloqueaEnCadena,
  detectarCiclos,
  esDelPlan,
  estadisticas,
  horasElectivasPorNivel,
  materiaDe,
  progresoTituloIntermedio,
} from '../src/lib/grafo';
import { PROGRESO_VACIO } from '../src/lib/progreso';
import { aprobadas, combinar, derivadaPorId, grafo, rango, regulares, slug } from './ayudas';

describe('arranque: todo pendiente', () => {
  it('habilita exactamente 9 materias, no 8', () => {
    const derivadas = derivarTodas(PROGRESO_VACIO, grafo);
    const disponibles = grafo.materias
      .filter((m) => derivadas.get(m.slug)?.habilitacion === 'disponible')
      .map((m) => m.id)
      .sort((a, b) => a - b);

    // Las 8 de nivel 1 + Ingeniería y Sociedad (11), que no tiene correlativas
    // pese a ser de nivel 2. Si da 8, la lógica está filtrando por nivel en
    // vez de por correlativas.
    expect(disponibles).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 11]);
  });

  it('cuenta 9 disponibles y el resto bloqueadas en las estadísticas', () => {
    const stats = estadisticas(PROGRESO_VACIO, grafo);

    expect(stats.total).toBe(37); // 36 obligatorias + PPS
    expect(stats.disponibles).toBe(9);
    expect(stats.bloqueadas).toBe(28);
    expect(stats.aprobadas).toBe(0);
    expect(stats.restantes).toBe(37);
    expect(stats.porcentaje).toBe(0);
  });
});

describe('los dos ejes de correlatividad', () => {
  it('con 1 y 2 REGULARES se desbloquean Análisis Matemático II (9) y Probabilidad (17)', () => {
    const progreso = regulares(1, 2);

    expect(derivadaPorId(9, progreso).habilitacion).toBe('disponible');
    expect(derivadaPorId(17, progreso).habilitacion).toBe('disponible');
  });

  it('con 1 y 2 REGULARES, Economía (18) sigue bloqueada: exige los finales', () => {
    const conRegulares = regulares(1, 2);
    const conAprobadas = aprobadas(1, 2);

    // Este es el test que separa los dos ejes.
    expect(derivadaPorId(18, conRegulares).habilitacion).toBe('bloqueada');
    expect(derivadaPorId(18, conAprobadas).habilitacion).toBe('disponible');
  });

  it('Análisis Numérico (22) exige 9 regular Y 1-2 aprobadas, no una sola de las dos', () => {
    const soloRegular9 = combinar(aprobadas(1, 2, 3), regulares(9));
    const soloAprobadas12 = aprobadas(1, 2);
    const ambas = combinar(aprobadas(1, 2), regulares(9));
    const ninguna = regulares(1, 2, 9);

    expect(derivadaPorId(22, ambas).habilitacion).toBe('disponible');
    expect(derivadaPorId(22, soloRegular9).habilitacion).toBe('disponible'); // 1 y 2 aprobadas + 9 regular
    expect(derivadaPorId(22, soloAprobadas12).habilitacion).toBe('bloqueada'); // falta 9 regular
    expect(derivadaPorId(22, ninguna).habilitacion).toBe('bloqueada'); // 1 y 2 solo regulares
  });

  it('cursando NO cuenta como regularizada', () => {
    const cursando = { [slug(1)]: { estado: 'cursando' as const }, [slug(2)]: { estado: 'cursando' as const } };
    expect(derivadaPorId(9, cursando).habilitacion).toBe('bloqueada');
  });

  it('recursa NO cuenta como regularizada', () => {
    const recursa = { [slug(1)]: { estado: 'recursa' as const }, [slug(2)]: { estado: 'recursa' as const } };
    expect(derivadaPorId(9, recursa).habilitacion).toBe('bloqueada');
  });
});

describe('falta final correlativo', () => {
  // Bases de Datos (19): para cursar necesita 13 y 16 regulares + 5 y 6 aprobadas.
  // Para rendir necesita 5, 6, 13 y 16 APROBADAS.
  const cursando19 = combinar(aprobadas(5, 6), regulares(13, 16), regulares(19));

  it('una materia regular con el correlativo todavía regular no puede rendir', () => {
    const d = derivadaPorId(19, cursando19);

    expect(d.estado).toBe('regular');
    expect(d.puedeRendirFinal).toBe(false);
    expect(d.faltaFinalCorrelativo).toBe(true);
    expect(d.habilitacion).toBe('final-bloqueado');
  });

  it('nombra exactamente qué finales le faltan', () => {
    const faltantes = derivadaPorId(19, cursando19)
      .requisitosFaltantes.filter((r) => r.para === 'rendir')
      .map((r) => r.materia.id)
      .sort((a, b) => a - b);

    expect(faltantes).toEqual([13, 16]);
  });

  it('al aprobar los finales correlativos pasa a final-habilitado', () => {
    const conFinales = combinar(cursando19, aprobadas(13, 16));
    const d = derivadaPorId(19, conFinales);

    expect(d.puedeRendirFinal).toBe(true);
    expect(d.faltaFinalCorrelativo).toBe(false);
    expect(d.habilitacion).toBe('final-habilitado');
  });

  it('una materia PENDIENTE nunca es final-habilitado, aunque tenga todo aprobado', () => {
    const d = derivadaPorId(19, aprobadas(5, 6, 13, 16));

    expect(d.habilitacion).toBe('disponible');
    expect(d.puedeRendirFinal).toBe(false); // hay que cursarla primero
  });
});

describe('título intermedio', () => {
  it('llega al 100 % con la carrera en ~60 %', () => {
    // Las 24 del Analista: 1..23 + Seminario Integrador (id 100).
    const progreso = aprobadas(...rango(1, 23), 100);

    const titulo = progresoTituloIntermedio(progreso, grafo);
    expect(titulo.total).toBe(24);
    expect(titulo.aprobadas).toBe(24);
    expect(titulo.porcentaje).toBe(100);
    expect(titulo.completo).toBe(true);
    expect(titulo.faltantes).toEqual([]);

    // La carrera, en cambio, recién va por 23 de 37.
    const stats = estadisticas(progreso, grafo);
    expect(stats.aprobadas).toBe(23);
    expect(stats.porcentaje).toBeCloseTo(62.2, 1);
  });

  it('sin el Seminario Integrador no está completo, aunque tenga 1..23', () => {
    const titulo = progresoTituloIntermedio(aprobadas(...rango(1, 23)), grafo);

    expect(titulo.aprobadas).toBe(23);
    expect(titulo.completo).toBe(false);
    expect(titulo.faltantes).toEqual(['ad-seminario']);
  });
});

describe('materia prioritaria (desbloqueo en cadena)', () => {
  it('cuenta solo lo que realmente se destraba, no toda la descendencia', () => {
    // Con Lógica (5) y Sistemas y Procesos de Negocio (8) aprobadas, aprobar
    // Algoritmos (6) destraba 13, 14 y 16, y en cascada 19, 20, dos electivas
    // de nivel 3 y el Seminario Integrador.
    // Diseño de SI (23) NO entra: además exige Inglés I (4) aprobado, que está
    // fuera de la cadena. Ahí se ve que la simulación no regala requisitos.
    const enCadena = desbloqueaEnCadena(slug(6), aprobadas(5, 8), grafo);

    // Diseño de SI (23) NO entra: además exige Inglés I (4), que está fuera de
    // la cadena. Ahí se ve que la simulación no regala requisitos.
    expect(enCadena).not.toContain(slug(23));

    // Las del plan, en orden de plan. Es lo que cuenta la caja MATERIA PRIORITARIA.
    const soloPlan = enCadena.filter((s) => esDelPlan(materiaDe(grafo, s)));
    expect(soloPlan).toEqual([slug(13), slug(14), slug(16), slug(19), slug(20), slug(100)]);

    // Y las electivas de 3° que dependen de Análisis de SI.
    const electivas = enCadena.filter((s) => !esDelPlan(materiaDe(grafo, s))).sort();
    expect(electivas).toEqual(['el-seguridad-informatica', 'el-ux-productos', 'el-ux-ui']);
  });

  it('devuelve vacío cuando aprobar la materia no destraba nada por sí solo', () => {
    // Con todo pendiente, aprobar Algoritmos no alcanza: 13 y 14 también
    // piden Lógica (5), y 16 pide Sistemas y Procesos de Negocio (8).
    expect(desbloqueaEnCadena(slug(6), {}, grafo)).toEqual([]);
  });

  it('una materia terminal no desbloquea nada', () => {
    expect(desbloqueaEnCadena(slug(36), aprobadas(...rango(1, 35)), grafo)).toEqual([]);
  });
});

describe('electivas: se cuentan horas por nivel, no materias', () => {
  it('compara contra 96 / 144 / 240', () => {
    const resumen = horasElectivasPorNivel({}, grafo);

    expect(resumen.porNivel[3].requeridas).toBe(96);
    expect(resumen.porNivel[4].requeridas).toBe(144);
    expect(resumen.porNivel[5].requeridas).toBe(240);
    expect(resumen.totalRequeridas).toBe(480);
    expect(resumen.cumpleTodo).toBe(false);
  });

  it('suma solo las electivas con el final aprobado', () => {
    const progreso = {
      'el-cloud': { estado: 'aprobada' as const }, // nivel 4, 64 hs
      'el-sgc': { estado: 'regular' as const }, // nivel 4, 96 hs, todavía no suma
    };
    const resumen = horasElectivasPorNivel(progreso, grafo);

    expect(resumen.porNivel[4].aprobadas).toBe(64);
    expect(resumen.porNivel[4].enProgreso).toBe(96);
    expect(resumen.porNivel[4].cumple).toBe(false);
  });

  it('cumple el nivel 4 con 160 hs (96 + 64)', () => {
    const progreso = {
      'el-sgc': { estado: 'aprobada' as const }, // 96 hs
      'el-cloud': { estado: 'aprobada' as const }, // 64 hs
    };
    const resumen = horasElectivasPorNivel(progreso, grafo);

    expect(resumen.porNivel[4].aprobadas).toBe(160);
    expect(resumen.porNivel[4].cumple).toBe(true);
    expect(resumen.cumpleTodo).toBe(false); // faltan nivel 3 y 5
  });

  it('el excedente de un nivel NO tapa el faltante de otro', () => {
    // Todas las electivas de nivel 5, que solas ya superan las 480 hs totales.
    const deNivel5 = grafo.electivas.filter((e) => e.nivel === 5);
    const horasNivel5 = deNivel5.reduce((acc, e) => acc + e.horasTotales, 0);
    const progreso = Object.fromEntries(
      deNivel5.map((e) => [e.slug, { estado: 'aprobada' as const }]),
    );
    const resumen = horasElectivasPorNivel(progreso, grafo);

    expect(resumen.totalAprobadas).toBe(horasNivel5);
    expect(resumen.totalAprobadas).toBeGreaterThan(resumen.totalRequeridas);
    expect(resumen.porNivel[5].cumple).toBe(true);
    expect(resumen.cumpleTodo).toBe(false);
    // El % global topea por nivel: 240 de 480 acreditadas.
    expect(resumen.porcentaje).toBe(50);
  });
});

describe('integridad del grafo', () => {
  it('no tiene ciclos', () => {
    expect(detectarCiclos(grafo)).toEqual([]);
  });

  it('no tiene referencias a materias inexistentes', () => {
    expect(grafo.referenciasRotas).toEqual([]);
  });

  it('respeta el orden de niveles: nadie depende de algo de un nivel superior', () => {
    const violaciones = grafo.aristas.filter((a) => {
      const requisito = grafo.porSlug.get(a.desde);
      const materia = grafo.porSlug.get(a.hasta);
      return requisito !== undefined && materia !== undefined && requisito.nivel > materia.nivel;
    });

    expect(violaciones).toEqual([]);
  });
});
