/**
 * El archivo de respaldo entra desde afuera: puede estar corrupto, ser de otra
 * app o traer materias de una versión vieja del plan. Estos tests son el
 * contrato de que nada de eso rompe ni borra el avance.
 */

import { describe, expect, it } from 'vitest';

import {
  NOMBRE_APP,
  VERSION_RESPALDO,
  crearRespaldo,
  leerRespaldo,
  nombreDeArchivo,
} from '../src/lib/respaldo';
import { aprobadas, combinar, grafo, regulares } from './ayudas';

const AHORA = new Date(2026, 7, 25, 14, 30);

describe('exportar', () => {
  it('envuelve el avance con app, plan, versión y fecha', () => {
    const progreso = combinar(aprobadas(1, 2), regulares(9));
    const respaldo = crearRespaldo(progreso, grafo, AHORA);

    expect(respaldo.app).toBe(NOMBRE_APP);
    expect(respaldo.plan).toBe('utn-frt-isi-2023');
    expect(respaldo.version).toBe(VERSION_RESPALDO);
    expect(respaldo.progreso).toEqual(progreso);
  });

  it('nombra el archivo con la fecha del día', () => {
    expect(nombreDeArchivo(AHORA)).toBe('utrackern-2026-08-25.json');
  });

  it('lo que exporta se puede volver a importar tal cual', () => {
    const progreso = combinar(aprobadas(1, 2, 5, 6), regulares(9, 13));
    const json = JSON.stringify(crearRespaldo(progreso, grafo, AHORA));
    const leido = leerRespaldo(json, grafo);

    expect(leido.ok).toBe(true);
    if (leido.ok) expect(leido.progreso).toEqual(progreso);
  });
});

describe('importar: archivos rotos', () => {
  it('un texto que no es JSON no rompe', () => {
    const r = leerRespaldo('esto no es json {{{', grafo);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('JSON');
  });

  it('un JSON que no es objeto tampoco', () => {
    expect(leerRespaldo('[1,2,3]', grafo).ok).toBe(false);
    expect(leerRespaldo('"hola"', grafo).ok).toBe(false);
    expect(leerRespaldo('null', grafo).ok).toBe(false);
  });

  it('un objeto vacío avisa que no hay avance', () => {
    const r = leerRespaldo('{}', grafo);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('ningún avance');
  });
});

describe('importar: entradas que no se entienden', () => {
  it('descarta slugs que no existen y sigue con el resto', () => {
    const json = JSON.stringify({
      progreso: {
        'isi-01': { estado: 'aprobada' },
        'isi-999': { estado: 'aprobada' },
        'materia-de-otra-carrera': { estado: 'regular' },
      },
    });
    const r = leerRespaldo(json, grafo);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.importadas).toBe(1);
    expect(r.ignoradas).toHaveLength(2);
    expect(r.ignoradas.join(' ')).toContain('no existe en el plan');
  });

  it('descarta estados inventados', () => {
    const json = JSON.stringify({
      progreso: {
        'isi-01': { estado: 'aprobada' },
        'isi-02': { estado: 'promocionada' },
        'isi-03': { estado: 42 },
        'isi-04': 'aprobada',
      },
    });
    const r = leerRespaldo(json, grafo);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.importadas).toBe(1);
    expect(r.ignoradas).toHaveLength(3);
  });

  it('si no queda nada válido, no importa nada', () => {
    const json = JSON.stringify({ progreso: { 'isi-999': { estado: 'aprobada' } } });
    const r = leerRespaldo(json, grafo);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('reconozca');
  });

  it('no guarda las materias en pendiente: es el estado por defecto', () => {
    const json = JSON.stringify({
      progreso: { 'isi-01': { estado: 'aprobada' }, 'isi-02': { estado: 'pendiente' } },
    });
    const r = leerRespaldo(json, grafo);

    expect(r.ok).toBe(true);
    if (r.ok) expect(Object.keys(r.progreso)).toEqual(['isi-01']);
  });
});

describe('importar: casos amables', () => {
  it('acepta un Progreso pelado, sin el envoltorio', () => {
    const r = leerRespaldo(JSON.stringify({ 'isi-01': { estado: 'aprobada' } }), grafo);

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.importadas).toBe(1);
  });

  it('conserva nota y fecha si vienen bien tipadas', () => {
    const json = JSON.stringify({
      progreso: { 'isi-01': { estado: 'aprobada', nota: 8, fecha: '2026-03-14' } },
    });
    const r = leerRespaldo(json, grafo);

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.progreso['isi-01']).toEqual({ estado: 'aprobada', nota: 8, fecha: '2026-03-14' });
  });

  it('descarta nota y fecha con tipos raros, pero no la materia', () => {
    const json = JSON.stringify({
      progreso: { 'isi-01': { estado: 'aprobada', nota: 'ocho', fecha: 20260314 } },
    });
    const r = leerRespaldo(json, grafo);

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.progreso['isi-01']).toEqual({ estado: 'aprobada' });
  });

  it('avisa si el archivo dice ser de otro plan, pero igual importa', () => {
    const json = JSON.stringify({
      plan: 'utn-frt-isi-2008',
      progreso: { 'isi-01': { estado: 'aprobada' } },
    });
    const r = leerRespaldo(json, grafo);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.importadas).toBe(1);
    expect(r.aviso).toContain('2008');
  });

  it('sin aviso cuando el plan coincide', () => {
    const json = JSON.stringify(crearRespaldo(aprobadas(1), grafo, AHORA));
    const r = leerRespaldo(json, grafo);

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.aviso).toBeNull();
  });

  it('acepta electivas y el Seminario Integrador', () => {
    const json = JSON.stringify({
      progreso: { 'el-cloud': { estado: 'aprobada' }, 'ad-seminario': { estado: 'regular' } },
    });
    const r = leerRespaldo(json, grafo);

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.importadas).toBe(2);
  });
});
