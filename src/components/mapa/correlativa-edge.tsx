'use client';

/**
 * Arista de correlatividad (§4.3).
 *
 * - **Color** según el estado de la materia ORIGEN: si ya la aprobaste, la
 *   flecha se pone verde y el camino "se enciende" hacia abajo.
 * - **Estilo** según para qué sirve: sólida para *cursar*, punteada para
 *   *rendir final*.
 * - Al seleccionar un nodo, las aristas ajenas caen a opacidad .12 y las del
 *   subgrafo resaltado pasan a punteadas animadas en el color de acento.
 */

import { BaseEdge, getBezierPath, type Edge, type EdgeProps } from '@xyflow/react';

import type { EstadoMateria } from '../../data/plan-utn-frt-isi-2023';
import type { TipoArista } from '../../lib/grafo';
import { ACENTO, COLOR_ARISTA, GROSOR_ARISTA, OPACIDAD_ARISTA } from '../../lib/theme';

export interface DatosArista extends Record<string, unknown> {
  tipo: TipoArista;
  estadoOrigen: EstadoMateria;
  /** Forma parte del subgrafo de la materia seleccionada. */
  resaltada: boolean;
  /** Hay una selección activa y esta arista no participa. */
  atenuada: boolean;
}

export type AristaCorrelativa = Edge<DatosArista, 'correlativa'>;

export function CorrelativaEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
}: EdgeProps<AristaCorrelativa>) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const estado: EstadoMateria = data?.estadoOrigen ?? 'pendiente';
  const resaltada = data?.resaltada === true;
  const atenuada = data?.atenuada === true;

  const trazo = resaltada ? ACENTO.hex : COLOR_ARISTA[estado];
  const opacidad = atenuada ? 0.12 : resaltada ? 1 : OPACIDAD_ARISTA[estado];

  return (
    <BaseEdge
      id={id}
      path={path}
      className={resaltada ? 'arista-resaltada' : undefined}
      style={{
        stroke: trazo,
        strokeWidth: resaltada ? GROSOR_ARISTA + 0.5 : GROSOR_ARISTA,
        strokeOpacity: opacidad,
        strokeDasharray: resaltada ? '6 4' : data?.tipo === 'rendir' ? '4 4' : undefined,
      }}
    />
  );
}
