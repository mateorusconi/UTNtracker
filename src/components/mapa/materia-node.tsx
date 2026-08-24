'use client';

/**
 * Tarjeta de materia (§4.2 del prompt maestro).
 *
 *   ┌──────────────────────────────────────┐
 *   │ 19 · Falta final correlativo      ⏳ │  ← línea meta: 11px, muted
 *   │ Bases de Datos                       │  ← nombre: text-sm, leading-tight
 *   └──────────────────────────────────────┘
 *      ●                                  ●   ← handles izq/der (4 px)
 *
 * Clic izquierdo → selecciona y resalta el subgrafo (§4.6).
 * Clic derecho (o *long-press* en touch) → menú de estados (§4.7).
 */

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import {
  CalendarX,
  Circle,
  CircleCheck,
  Hourglass,
  Lock,
  PencilLine,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import type { EstadoMateria } from '../../data/plan-utn-frt-isi-2023';
import {
  numeroVisible,
  sufijoMeta,
  tooltipMateria,
  NOMBRE_ESTADO,
  type ContextoSeleccion,
} from '../../lib/etiquetas';
import { tieneFinal, type MateriaDerivada } from '../../lib/grafo';
import { estadoDe } from '../../lib/progreso';
import {
  ESTILO_ELECTIVA,
  ESTILO_INTEGRADORA,
  ESTILO_SELECCIONADA,
  ESTILO_NODO,
  cx,
  esElectiva,
  varianteDe,
  type VarianteNodo,
} from '../../lib/theme';
import { usarMapa } from '../../store/usar-mapa';
import { usarProgreso } from '../../store/usar-progreso';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu';

export interface DatosMateria extends Record<string, unknown> {
  derivada: MateriaDerivada;
  /** Relación con el nodo seleccionado. */
  contexto: ContextoSeleccion;
  /** Los nodos no relacionados con la selección bajan a opacidad .25 (§4.6). */
  atenuada: boolean;
}

export type NodoMateria = Node<DatosMateria, 'materia'>;

const ICONO: Record<VarianteNodo, LucideIcon> = {
  aprobada: CircleCheck,
  cursando: PencilLine,
  regular: Hourglass,
  recursa: CalendarX,
  disponible: Circle,
  bloqueada: Lock,
};

/** Los cinco estados del menú contextual, en el orden en que se avanza. */
const ESTADOS: readonly { estado: EstadoMateria; icono: LucideIcon; color: string }[] = [
  { estado: 'pendiente', icono: Circle, color: 'text-zinc-500 dark:text-zinc-400' },
  { estado: 'cursando', icono: PencilLine, color: 'text-cyan-600 dark:text-cyan-400' },
  { estado: 'regular', icono: Hourglass, color: 'text-amber-600 dark:text-amber-400' },
  { estado: 'aprobada', icono: CircleCheck, color: 'text-emerald-600 dark:text-emerald-400' },
  { estado: 'recursa', icono: CalendarX, color: 'text-red-600 dark:text-red-400' },
];

export function MateriaNode({ data }: NodeProps<NodoMateria>) {
  const { derivada, contexto, atenuada } = data;
  const { materia } = derivada;

  const variante = varianteDe(derivada.estado, derivada.habilitacion);
  const estilo = ESTILO_NODO[variante];
  const Icono = ICONO[variante];
  const sufijo = sufijoMeta(derivada, contexto);

  /**
   * Cambia el estado y ofrece deshacer. Marcar mal una materia y perder el
   * estado anterior es la peor fricción posible (§4.7), así que el toast
   * guarda el valor previo y lo restaura.
   */
  const cambiarEstado = (nuevo: EstadoMateria): void => {
    const anterior = estadoDe(usarProgreso.getState().progreso, materia.slug);
    if (anterior === nuevo) return;

    usarProgreso.getState().marcarMateria(materia.slug, nuevo);
    toast(materia.nombre, {
      description: `${NOMBRE_ESTADO[anterior]} → ${NOMBRE_ESTADO[nuevo]}`,
      action: {
        label: 'Deshacer',
        onClick: () => usarProgreso.getState().marcarMateria(materia.slug, anterior),
      },
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          title={tooltipMateria(derivada)}
          onClick={() => usarMapa.getState().seleccionar(materia.slug)}
          className={cx(
            // El wrapper de React Flow va con pointer-events:none porque el
            // canvas es no-seleccionable; la tarjeta los vuelve a habilitar.
            'pointer-events-auto relative flex h-full w-full flex-col justify-center overflow-hidden rounded-xl border px-3 py-2 transition-opacity duration-200',
            estilo.contenedor,
            esElectiva(materia) && ESTILO_ELECTIVA,
            contexto === 'seleccionada' && ESTILO_SELECCIONADA,
            atenuada && 'opacity-25',
          )}
        >
          {materia.integradora === true && <span className={ESTILO_INTEGRADORA} aria-hidden />}

          <Handle type="target" position={Position.Left} isConnectable={false} />

          <div className={cx('flex items-center gap-1.5 text-[11px] leading-none', estilo.meta)}>
            <span className="truncate">
              {numeroVisible(materia)}
              {sufijo !== null && ` · ${sufijo}`}
            </span>
            {materia.requiereVerificacion === true && (
              <TriangleAlert
                className="size-3 shrink-0 text-amber-500"
                aria-label="Dato a verificar"
              />
            )}
            <Icono className="ml-auto size-3.5 shrink-0" aria-hidden />
          </div>

          <p className="mt-1 line-clamp-2 text-sm leading-tight font-medium">{materia.nombre}</p>

          <Handle type="source" position={Position.Right} isConnectable={false} />
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuLabel>
          {numeroVisible(materia)} · {materia.nombre}
        </ContextMenuLabel>
        <ContextMenuSeparator />
        {ESTADOS.map(({ estado, icono: IconoEstado, color }) => {
          // La PPS se acredita: no tiene sentido marcarla "regular".
          const deshabilitado = estado === 'regular' && !tieneFinal(materia);
          return (
            <ContextMenuItem
              key={estado}
              disabled={deshabilitado}
              onSelect={() => cambiarEstado(estado)}
            >
              <IconoEstado className={cx('size-4 shrink-0', color)} />
              <span>{NOMBRE_ESTADO[estado]}</span>
              {derivada.estado === estado && (
                <span className="ml-auto text-[11px] text-zinc-500 dark:text-zinc-400">actual</span>
              )}
            </ContextMenuItem>
          );
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
}
