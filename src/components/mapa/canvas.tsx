'use client';

/**
 * El mapa. React Flow con layout determinístico: los nodos no se arrastran,
 * las posiciones salen siempre de `calcularLayout`.
 *
 * La selección (§4.6) vive en `usarMapa` y el avance en `usarProgreso`; todo lo
 * que se dibuja acá es derivado de esos dos.
 */

import {
  Background,
  BackgroundVariant,
  ReactFlow,
  type EdgeTypes,
  type NodeTypes,
} from '@xyflow/react';
import { useMemo } from 'react';

import { contextoDe } from '../../lib/etiquetas';
import { calcularResaltado, derivarTodas, grafoPorDefecto, type Resaltado } from '../../lib/grafo';
import {
  ALTO_NODO,
  ANCHO_NODO,
  PADDING_ENCUADRE,
  calcularLayout,
  nodosDelLayout,
} from '../../lib/layout';
import { estadoDe } from '../../lib/progreso';
import { usarMapa } from '../../store/usar-mapa';
import { usarProgreso } from '../../store/usar-progreso';
import { ColumnasAnio } from './columnas-anio';
import { Controles } from './controles';
import { CorrelativaEdge, type AristaCorrelativa } from './correlativa-edge';
import { MateriaNode, type NodoMateria } from './materia-node';

const NODE_TYPES = { materia: MateriaNode } satisfies NodeTypes;
const EDGE_TYPES = { correlativa: CorrelativaEdge } satisfies EdgeTypes;

export function Canvas() {
  const progreso = usarProgreso((estado) => estado.progreso);
  const capas = usarMapa((estado) => estado.capas);
  const seleccionada = usarMapa((estado) => estado.seleccionada);

  const grafo = useMemo(() => grafoPorDefecto(), []);
  const layout = useMemo(() => calcularLayout(grafo.materias), [grafo]);
  const derivadas = useMemo(() => derivarTodas(progreso, grafo), [progreso, grafo]);

  const resaltado = useMemo<Resaltado | null>(
    () => (seleccionada === null ? null : calcularResaltado(seleccionada, grafo)),
    [seleccionada, grafo],
  );

  const nodes = useMemo<NodoMateria[]>(() => {
    const salida: NodoMateria[] = [];
    for (const { materia, x, y } of nodosDelLayout(layout)) {
      const derivada = derivadas.get(materia.slug);
      if (derivada === undefined) continue;
      salida.push({
        id: materia.slug,
        type: 'materia',
        position: { x, y },
        width: ANCHO_NODO,
        height: ALTO_NODO,
        data: {
          derivada,
          contexto: contextoDe(materia.slug, resaltado),
          atenuada: resaltado !== null && !resaltado.relacionadas.has(materia.slug),
        },
      });
    }
    return salida;
  }, [layout, derivadas, resaltado]);

  const edges = useMemo<AristaCorrelativa[]>(() => {
    // Las electivas no van al mapa principal (tienen su vista propia en la
    // Fase 4), así que descartamos las aristas que apuntan fuera del lienzo.
    const enMapa = new Set(grafo.materias.map((m) => m.slug));
    const salida: AristaCorrelativa[] = [];

    for (const arista of grafo.aristas) {
      if (!capas[arista.tipo]) continue;
      if (!enMapa.has(arista.desde) || !enMapa.has(arista.hasta)) continue;

      const estadoOrigen = estadoDe(progreso, arista.desde);
      const resaltada =
        resaltado !== null &&
        resaltado.relacionadas.has(arista.desde) &&
        resaltado.relacionadas.has(arista.hasta);

      salida.push({
        id: arista.id,
        source: arista.desde,
        target: arista.hasta,
        type: 'correlativa',
        // Sin `markerEnd`: la punta de flecha se dibuja sobre el handle, que
        // está pegado al borde de la tarjeta. Con muchas aristas convergiendo
        // en la misma materia, se apilan contra el borde y ensucian. La
        // referencia tampoco las usa: la dirección ya la da el layout, que
        // siempre va de izquierda a derecha.
        data: {
          tipo: arista.tipo,
          estadoOrigen,
          resaltada,
          atenuada: resaltado !== null && !resaltada,
        },
      });
    }
    return salida;
  }, [grafo, capas, progreso, resaltado]);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        fitView
        fitViewOptions={{ padding: PADDING_ENCUADRE }}
        minZoom={0.2}
        maxZoom={1.8}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        onPaneClick={() => usarMapa.getState().seleccionar(null)}
      >
        {/* Puntos más presentes pero sin contraste: suben de tamaño (1.8) antes
            que de opacidad, así se leen como textura y no como ruido. */}
        <Background variant={BackgroundVariant.Dots} gap={20} size={2.2} color="var(--puntos)" />
        <ColumnasAnio layout={layout} />
        <Controles />
      </ReactFlow>
    </div>
  );
}
