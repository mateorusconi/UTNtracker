/**
 * Las cuatro reglas que no son una lista de IDs (§2.3 del prompt maestro):
 * Proyecto Final, Práctica Profesional Supervisada, Seminario Integrador y
 * las electivas. Son las que rompen a cualquier tracker genérico.
 */

import { describe, expect, it } from 'vitest';

import {
  ID_SEMINARIO_INTEGRADOR,
  esDeIngenieria,
  estadisticas,
  horasElectivasPorNivel,
  puedeCursar,
  puedeRendirFinal,
  tieneFinal,
} from '../src/lib/grafo';
import {
  aprobadas,
  combinar,
  derivadaPorId,
  derivadaPorSlug,
  grafo,
  materia,
  rango,
  regulares,
  slug,
} from './ayudas';

// ─────────────────────────────────────────────────────────────────────────────

describe('Proyecto Final (36)', () => {
  /** Lo mínimo para inscribirse a cursar: 25-26-30 regulares y 12-20-23 aprobadas. */
  const paraCursarlo = combinar(regulares(25, 26, 30), aprobadas(12, 20, 23));

  it('se cursa con 25-26-30 regulares y 12-20-23 aprobadas, sin tener todo el plan', () => {
    const d = derivadaPorId(36, paraCursarlo);

    expect(d.puedeCursar).toBe(true);
    expect(d.habilitacion).toBe('disponible');
  });

  it('no se cursa si falta una sola de las regularizadas', () => {
    const sinRedes = combinar(regulares(25, 30), aprobadas(12, 20, 23));
    expect(derivadaPorId(36, sinRedes).puedeCursar).toBe(false);
  });

  it('no se cursa si una de las que exige aprobada está apenas regular', () => {
    const conDesarrolloRegular = combinar(regulares(25, 26, 30, 20), aprobadas(12, 23));
    expect(derivadaPorId(36, conDesarrolloRegular).puedeCursar).toBe(false);
  });

  it('el final SOLO se habilita con las 35 previas aprobadas', () => {
    const casiTodo = combinar(aprobadas(...rango(1, 34)), regulares(35, 36));
    const todo = combinar(aprobadas(...rango(1, 35)), regulares(36));

    // Le falta el final de Seguridad en los SI (35).
    const parcial = derivadaPorId(36, casiTodo);
    expect(parcial.puedeRendirFinal).toBe(false);
    expect(parcial.faltaFinalCorrelativo).toBe(true);
    expect(parcial.habilitacion).toBe('final-bloqueado');
    expect(parcial.requisitosFaltantes.filter((r) => r.para === 'rendir').map((r) => r.materia.id)).toEqual([35]);

    const completo = derivadaPorId(36, todo);
    expect(completo.puedeRendirFinal).toBe(true);
    expect(completo.habilitacion).toBe('final-habilitado');
  });

  it('codifica la regla textual del Anexo I', () => {
    expect(materia(36).reglaEspecial).toBe('TODAS_LAS_PREVIAS_APROBADAS_PARA_RENDIR');
    expect(materia(36).correlativas.paraRendir.aprobadas).toEqual(rango(1, 35));
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Práctica Profesional Supervisada (37)', () => {
  const pps = materia(37);
  const requisitosDeProyectoFinal = combinar(regulares(25, 26, 30), aprobadas(12, 20, 23));

  it('no tiene final: se acredita', () => {
    expect(tieneFinal(pps)).toBe(false);
    expect(pps.horasTotales).toBe(200);
  });

  it('se habilita con los mismos requisitos que la inscripción a Proyecto Final', () => {
    expect(puedeCursar(pps, requisitosDeProyectoFinal, grafo)).toBe(true);
    expect(puedeCursar(materia(36), requisitosDeProyectoFinal, grafo)).toBe(true);
    expect(puedeCursar(pps, {}, grafo)).toBe(false);
  });

  it('nunca queda esperando un final, ni siquiera marcada como regular', () => {
    const enCurso = combinar(requisitosDeProyectoFinal, regulares(37));
    const d = derivadaPorId(37, enCurso);

    expect(puedeRendirFinal(pps, enCurso, grafo)).toBe(false);
    expect(d.faltaFinalCorrelativo).toBe(false);
    expect(d.habilitacion).toBe('disponible'); // nunca 'final-bloqueado'
    expect(d.requisitosFaltantes.filter((r) => r.para === 'rendir')).toEqual([]);
  });

  it('cuenta para el total de la carrera: 36 asignaturas + PPS', () => {
    expect(esDeIngenieria(pps)).toBe(true);
    expect(estadisticas({}, grafo).total).toBe(37);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Seminario Integrador (100)', () => {
  const seminario = materia(ID_SEMINARIO_INTEGRADOR);

  it('usa el id 100 para no chocar con Legislación, que es el N° 24 de la Ord. 1878', () => {
    expect(seminario.slug).toBe('ad-seminario');
    expect(materia(24).nombre).toBe('Legislación');
  });

  it('se cursa con 16 regular y 6-8-13-14 aprobadas', () => {
    const listo = combinar(regulares(16), aprobadas(6, 8, 13, 14));
    expect(derivadaPorId(100, listo).habilitacion).toBe('disponible');

    const sinAnalisis = aprobadas(6, 8, 13, 14);
    expect(derivadaPorId(100, sinAnalisis).habilitacion).toBe('bloqueada');
  });

  it('el final exige las 23 materias previas del título aprobadas', () => {
    const cursandoSeminario = combinar(aprobadas(...rango(1, 22)), regulares(23, 100));
    const parcial = derivadaPorId(100, cursandoSeminario);

    expect(parcial.puedeRendirFinal).toBe(false);
    expect(parcial.habilitacion).toBe('final-bloqueado');

    const todoAprobado = combinar(aprobadas(...rango(1, 23)), regulares(100));
    expect(derivadaPorId(100, todoAprobado).puedeRendirFinal).toBe(true);
  });

  it('NO forma parte de las 36 de Ingeniería: no mueve el % de la carrera', () => {
    expect(esDeIngenieria(seminario)).toBe(false);

    const sinSeminario = estadisticas(aprobadas(...rango(1, 23)), grafo);
    const conSeminario = estadisticas(aprobadas(...rango(1, 23), 100), grafo);

    expect(conSeminario.aprobadas).toBe(sinSeminario.aprobadas);
    expect(conSeminario.porcentaje).toBe(sinSeminario.porcentaje);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('electivas', () => {
  it('Computación en la Nube se destraba con 15, 23 y 19 regularizadas', () => {
    expect(derivadaPorSlug('el-cloud', {}).habilitacion).toBe('bloqueada');

    const listo = regulares(15, 23, 19);
    const d = derivadaPorSlug('el-cloud', listo);
    expect(d.habilitacion).toBe('disponible');
    expect(d.materia.nivel).toBe(4);
    expect(d.materia.horasTotales).toBe(64);
  });

  it('nombra las correlativas que le faltan a una electiva', () => {
    const faltantes = derivadaPorSlug('el-cloud', regulares(15))
      .requisitosFaltantes.filter((r) => r.para === 'cursar')
      .map((r) => r.materia.id)
      .sort((a, b) => a - b);

    expect(faltantes).toEqual([19, 23]);
  });

  it('no participa del contador de materias de la carrera', () => {
    const conElectivas = Object.fromEntries(
      grafo.electivas.map((e) => [e.slug, { estado: 'aprobada' as const }]),
    );

    expect(estadisticas(conElectivas, grafo).aprobadas).toBe(0);
    expect(estadisticas(conElectivas, grafo).total).toBe(37);
  });

  it('Seguridad Informática ya no arranca disponible: la tabla del Departamento la confirmó', () => {
    const seguridad = grafo.porSlug.get('el-seguridad-informatica');

    // El OCR de la Res. 2386 había dejado la tabla vacía y la electiva figuraba
    // disponible desde el día uno. La tabla del Departamento la resolvió.
    expect(seguridad?.requiereVerificacion).toBeUndefined();
    expect(seguridad?.correlativas.paraCursar.regularizadas).toEqual([16]);

    expect(derivadaPorSlug('el-seguridad-informatica', {}).habilitacion).toBe('bloqueada');
    expect(derivadaPorSlug('el-seguridad-informatica', regulares(16)).habilitacion).toBe(
      'disponible',
    );
  });

  it('lo que sigue en conflicto entre fuentes queda marcado, no resuelto a ojo', () => {
    // La Res. 2386 exige 8 y 16 aprobadas; la tabla del Departamento deja esa
    // columna vacía. Mantenemos el criterio más exigente y lo señalamos.
    const auditoria = grafo.porSlug.get('el-auditoria');

    expect(auditoria?.requiereVerificacion).toBe(true);
    expect(auditoria?.correlativas.paraCursar.aprobadas).toEqual([8, 16]);
    expect(derivadaPorSlug('el-auditoria', regulares(23)).habilitacion).toBe('bloqueada');
  });

  it('la que sigue sin carga horaria publicada entra, pero con 0 hs', () => {
    // Aparece en el catálogo porque existe; no suma horas porque el dato no
    // está publicado y no lo vamos a inventar.
    const sinHoras = grafo.porSlug.get('el-prog-distribuidas');
    expect(sinHoras?.horasTotales).toBe(0);
    expect(sinHoras?.regimen).toBe('sin-publicar');
    expect(sinHoras?.requiereVerificacion).toBe(true);

    // Aprobarla no mueve el contador de su nivel.
    const resumen = horasElectivasPorNivel(
      { 'el-prog-distribuidas': { estado: 'aprobada' as const } },
      grafo,
    );
    expect(resumen.porNivel[4].aprobadas).toBe(0);
  });

  it('Gestión de Procesos de Negocio queda marcada aunque tenga horas', () => {
    // La carga horaria la aportó el usuario, no la tabla: 4 hs, 1° cuatrimestre.
    // Las correlativas siguen sin fuente, así que la bandera se mantiene.
    const gestion = grafo.porSlug.get('el-gestion-procesos');

    expect(gestion?.horasTotales).toBe(64);
    expect(gestion?.regimen).toBe('cuatrimestral-1');
    expect(gestion?.requiereVerificacion).toBe(true);
    expect(gestion?.correlativas.paraCursar.regularizadas).toEqual([]);
  });

  it('Sistemas de Información Geográficos traduce el Plan 2008 y expande la regla', () => {
    const sig = grafo.porSlug.get('el-sig');

    // «Gestión de Datos» del Plan 2008 → Bases de Datos (19) del 2023.
    expect(sig?.correlativas.paraCursar.regularizadas).toEqual([19, 23]);
    // «Todas las Materias del 2° Nivel Excepto Física 2» → sin el 10.
    expect(sig?.correlativas.paraCursar.aprobadas).toEqual([9, 11, 12, 13, 14, 15, 16]);
    expect(sig?.correlativas.paraCursar.aprobadas).not.toContain(10);
    // Son interpretaciones nuestras, no transcripción: queda marcada.
    expect(sig?.requiereVerificacion).toBe(true);
  });

  it('las electivas nuevas traen las correlativas de la tabla del Departamento', () => {
    const testing = grafo.porSlug.get('el-testing');
    expect(testing?.correlativas.paraCursar.regularizadas).toEqual([19, 20, 23]);
    expect(testing?.horasTotales).toBe(64);

    const heuristicas = grafo.porSlug.get('el-heuristicas');
    expect(heuristicas?.correlativas.paraCursar.regularizadas).toEqual([22]);
    expect(heuristicas?.correlativas.paraCursar.aprobadas).toEqual([14, 17]);

    // Sin área de conocimiento publicada: se deja vacía antes que inventarla.
    expect(heuristicas?.areaConocimiento).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('inconsistencias del avance cargado', () => {
  it('detecta una materia marcada como aprobada sin cumplir las correlativas', () => {
    // Alguien marca Bases de Datos aprobada sin haber tocado 13 ni 16.
    const d = derivadaPorId(19, aprobadas(19));

    expect(d.inconsistente).toBe(true);
    expect(d.habilitacion).toBe('disponible'); // no la "des-aprobamos": solo la señalamos
    expect(estadisticas(aprobadas(19), grafo).inconsistentes).toBe(1);
  });

  it('no marca como inconsistente lo que sí cumple', () => {
    expect(derivadaPorId(1, aprobadas(1)).inconsistente).toBe(false);
    expect(derivadaPorId(9, combinar(aprobadas(1, 2), regulares(9))).inconsistente).toBe(false);
  });

  it('el slug es la clave estable del progreso, no el nombre', () => {
    expect(slug(19)).toBe('isi-19');
    expect(slug(100)).toBe('ad-seminario');
  });
});
