/**
 * Resaltado del subgrafo al seleccionar un nodo (§4.6).
 * Es lo que decide qué se atenúa al 25 % y qué línea meta se muestra.
 */

import { describe, expect, it } from 'vitest';

import { contextoDe } from '../src/lib/etiquetas';
import { calcularResaltado } from '../src/lib/grafo';
import { grafo, slug } from './ayudas';

describe('calcularResaltado', () => {
  // Análisis de Sistemas de Información (16): pide 6 y 8, y es correlativa de
  // media carrera.
  const resaltado = calcularResaltado(slug(16), grafo);

  it('los requisitos son los ancestros transitivos', () => {
    expect([...resaltado.requisitos].sort()).toEqual([slug(6), slug(8)]);
  });

  it('lo que desbloquea son los descendientes transitivos', () => {
    expect(resaltado.desbloquea.has(slug(19))).toBe(true);
    expect(resaltado.desbloquea.has(slug(20))).toBe(true);
    expect(resaltado.desbloquea.has(slug(23))).toBe(true);
    expect(resaltado.desbloquea.has(slug(100))).toBe(true);
    // Y en cadena, lo que depende de esas.
    expect(resaltado.desbloquea.has(slug(25))).toBe(true);
  });

  it('relacionadas es la unión más la materia seleccionada', () => {
    expect(resaltado.relacionadas.has(slug(16))).toBe(true);
    expect(resaltado.relacionadas.size).toBe(
      resaltado.requisitos.size + resaltado.desbloquea.size + 1,
    );
  });

  it('no se incluye a sí misma en requisitos ni en descendientes', () => {
    expect(resaltado.requisitos.has(slug(16))).toBe(false);
    expect(resaltado.desbloquea.has(slug(16))).toBe(false);
  });

  it('una materia terminal no desbloquea nada', () => {
    expect(calcularResaltado(slug(36), grafo).desbloquea.size).toBe(0);
  });

  it('una materia de primer año no tiene requisitos', () => {
    expect(calcularResaltado(slug(1), grafo).requisitos.size).toBe(0);
  });
});

describe('contextoDe', () => {
  const resaltado = calcularResaltado(slug(16), grafo);

  it('ubica cada materia en el subgrafo', () => {
    expect(contextoDe(slug(16), resaltado)).toBe('seleccionada');
    expect(contextoDe(slug(6), resaltado)).toBe('requisito');
    expect(contextoDe(slug(19), resaltado)).toBe('descendiente');
  });

  it('las materias ajenas al subgrafo no tienen contexto', () => {
    // Análisis Matemático I no es ni requisito ni consecuencia de 16.
    expect(contextoDe(slug(1), resaltado)).toBe('ninguno');
    expect(contextoDe(slug(4), resaltado)).toBe('ninguno');
  });

  it('sin selección, nadie tiene contexto', () => {
    expect(contextoDe(slug(16), null)).toBe('ninguno');
  });
});
