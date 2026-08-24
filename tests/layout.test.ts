/**
 * El layout es determinístico a propósito: el estudiante construye memoria
 * espacial del mapa y no puede reacomodarse solo entre renders.
 */

import { describe, expect, it } from 'vitest';

import {
  ALTO_ETIQUETA_ANIO,
  ALTO_NODO,
  ANCHO_NODO,
  GAP_NODOS,
  PASO_COLUMNA,
  PASO_NODO,
  calcularLayout,
  grupoCuatrimestre,
  nodosDelLayout,
} from '../src/lib/layout';
import { grafo, slug } from './ayudas';

const layout = calcularLayout(grafo.materias);

describe('columnas por año', () => {
  it('arma una columna por nivel', () => {
    expect(layout.columnas.map((c) => c.nivel)).toEqual([1, 2, 3, 4, 5]);
    expect(layout.columnas.map((c) => c.etiqueta)).toEqual([
      '1° Año',
      '2° Año',
      '3° Año',
      '4° Año',
      '5° Año',
    ]);
  });

  it('reparte las 38 materias del plan sin perder ninguna', () => {
    const porColumna = layout.columnas.map((c) => c.nodos.length);

    // 3° suma el Seminario Integrador y 5° suma la PPS.
    expect(porColumna).toEqual([8, 8, 8, 7, 7]);
    expect(nodosDelLayout(layout)).toHaveLength(grafo.materias.length);
  });

  it('separa las columnas 400 px (250 de tarjeta + 150 de aire)', () => {
    expect(PASO_COLUMNA).toBe(400);
    expect(layout.columnas.map((c) => c.x)).toEqual([0, 400, 800, 1200, 1600]);
    expect(layout.ancho).toBe(1600 + ANCHO_NODO);
  });

  it('alinea las tarjetas al borde izquierdo de su columna', () => {
    for (const columna of layout.columnas) {
      for (const nodo of columna.nodos) {
        expect(nodo.x).toBe(columna.x);
      }
    }
  });

  it('la columna es lo suficientemente alta para su contenido', () => {
    for (const columna of layout.columnas) {
      const ultimo = columna.nodos.at(-1);
      if (ultimo === undefined) continue;
      expect(columna.alto).toBeGreaterThanOrEqual(ultimo.y + ALTO_NODO);
    }
    expect(layout.alto).toBe(Math.max(...layout.columnas.map((c) => c.alto)));
  });
});

describe('orden dentro de la columna', () => {
  it('respeta el N° oficial del Anexo I', () => {
    const tercero = layout.columnas[2];
    expect(tercero?.nodos.map((n) => n.materia.id)).toEqual([17, 18, 19, 20, 21, 22, 23, 100]);

    const quinto = layout.columnas[4];
    expect(quinto?.nodos.map((n) => n.materia.id)).toEqual([31, 32, 33, 34, 35, 36, 37]);
  });

  it('deja el Seminario Integrador al final de 3° y la PPS al final de 5°', () => {
    expect(layout.columnas[2]?.nodos.at(-1)?.materia.slug).toBe(slug(100));
    expect(layout.columnas[4]?.nodos.at(-1)?.materia.slug).toBe(slug(37));
  });

  it('apila las tarjetas dejando aire, sin solaparse', () => {
    expect(PASO_NODO).toBe(ALTO_NODO + GAP_NODOS);
    expect(GAP_NODOS).toBeGreaterThanOrEqual(20); // el mapa necesita respirar

    for (const columna of layout.columnas) {
      for (let i = 1; i < columna.nodos.length; i += 1) {
        const anterior = columna.nodos[i - 1];
        const actual = columna.nodos[i];
        if (anterior === undefined || actual === undefined) continue;
        expect(actual.y).toBeGreaterThanOrEqual(anterior.y + ALTO_NODO);
      }
    }
  });

  it('arranca debajo de la etiqueta del año', () => {
    for (const columna of layout.columnas) {
      const primero = columna.nodos[0];
      if (primero === undefined) continue;
      expect(primero.y).toBe(ALTO_ETIQUETA_ANIO);
    }
  });
});

describe('cuatrimestres', () => {
  it('solo `cuatrimestral-2` baja al 2° cuatrimestre', () => {
    expect(grupoCuatrimestre('anual')).toBe(1);
    expect(grupoCuatrimestre('cuatrimestral-1')).toBe(1);
    expect(grupoCuatrimestre('cuatrimestral-1y2')).toBe(1);
    expect(grupoCuatrimestre('cuatrimestral-2')).toBe(2);
  });

  it('no dibuja separadores: en el Plan 2023 todas las obligatorias son anuales', () => {
    expect(grafo.materias.every((m) => m.regimen === 'anual')).toBe(true);
    expect(layout.columnas.flatMap((c) => c.separadores)).toEqual([]);
  });

  it('pero los dibuja si el nivel mezcla cuatrimestres', () => {
    const mezcla = [
      ...grafo.materias.filter((m) => m.nivel === 3),
      ...grafo.electivas.filter((e) => e.nivel === 3),
    ];
    const conElectivas = calcularLayout(mezcla);
    const tercero = conElectivas.columnas[2];

    expect(tercero?.separadores.map((s) => s.etiqueta)).toEqual(['2° Cuatrimestre']);
    // Las anuales quedan arriba y las del 2° cuatrimestre abajo del separador.
    const separadorY = tercero?.separadores[0]?.y ?? 0;
    for (const nodo of tercero?.nodos ?? []) {
      const esperado = grupoCuatrimestre(nodo.materia.regimen) === 1;
      expect(nodo.y < separadorY).toBe(esperado);
    }
  });
});

describe('determinismo', () => {
  it('misma entrada, mismas coordenadas', () => {
    expect(calcularLayout(grafo.materias)).toEqual(calcularLayout(grafo.materias));
  });

  it('no reordena el array que recibe', () => {
    const original = grafo.materias.map((m) => m.slug);
    calcularLayout(grafo.materias);
    expect(grafo.materias.map((m) => m.slug)).toEqual(original);
  });
});
