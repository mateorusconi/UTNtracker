'use client';

/**
 * ============================================================================
 *  CATÁLOGO DE ELECTIVAS
 * ============================================================================
 *
 *  Las 16 electivas habilitadas en FRT para 2026–2029 (Res. CD 2386/2025 y
 *  1082/2026), agrupadas por nivel.
 *
 *  Es una vista aparte y no nodos del mapa porque las electivas no son
 *  correlativas de nada: colgarían de los bordes del grafo ensuciándolo. Y
 *  sobre todo porque **el requisito no es aprobar N materias sino juntar horas
 *  por nivel** (96 / 144 / 240), que es una lectura de tabla, no de grafo.
 * ============================================================================
 */

import {
  CalendarX,
  Check,
  Circle,
  CircleCheck,
  Hourglass,
  PencilLine,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';

import type { EstadoMateria, Materia } from '../../data/plan-utn-frt-isi-2023';
import { NOMBRE_ESTADO, NOMBRE_REGIMEN, TAG_REGIMEN } from '../../lib/etiquetas';
import { derivar, grafoPorDefecto, horasElectivasPorNivel, type NivelElectiva } from '../../lib/grafo';
import { estaAprobada, estaRegularizada, estadoDe } from '../../lib/progreso';
import { ESTILO_NODO, cx, varianteDe } from '../../lib/theme';
import { usarMapa } from '../../store/usar-mapa';
import { usarProgreso } from '../../store/usar-progreso';

const NIVELES: readonly NivelElectiva[] = [3, 4, 5];

const ESTADOS: readonly { estado: EstadoMateria; icono: LucideIcon; color: string }[] = [
  { estado: 'pendiente', icono: Circle, color: 'text-zinc-500 dark:text-zinc-400' },
  { estado: 'cursando', icono: PencilLine, color: 'text-cyan-600 dark:text-cyan-400' },
  { estado: 'regular', icono: Hourglass, color: 'text-amber-600 dark:text-amber-400' },
  { estado: 'aprobada', icono: CircleCheck, color: 'text-emerald-600 dark:text-emerald-400' },
  { estado: 'recursa', icono: CalendarX, color: 'text-red-600 dark:text-red-400' },
];

export function DialogoElectivas() {
  const abierto = usarMapa((estado) => estado.electivasAbiertas);
  const progreso = usarProgreso((estado) => estado.progreso);
  const grafo = useMemo(() => grafoPorDefecto(), []);
  const resumen = useMemo(() => horasElectivasPorNivel(progreso, grafo), [progreso, grafo]);

  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (dialogo === null) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  const cerrar = (): void => usarMapa.getState().setElectivasAbiertas(false);

  return (
    <dialog
      ref={ref}
      onClose={cerrar}
      className="m-auto hidden max-h-[85vh] open:flex w-[min(62rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      style={{
        background: 'var(--popover)',
        borderColor: 'var(--border)',
        color: 'var(--popover-foreground)',
      }}
    >
      <header
        className="flex shrink-0 items-start gap-3 border-b p-5"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Electivas</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {grafo.electivas.length} habilitadas en FRT · Res. CD 2386/2025 y 1082/2026 + tabla
            del Departamento
          </p>
        </div>
        <button
          type="button"
          onClick={cerrar}
          className="ml-auto grid size-7 shrink-0 place-items-center rounded-md text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
          title="Cerrar"
        >
          <X className="size-4" />
        </button>
      </header>

      {/* Resumen de horas por nivel */}
      <div
        className="grid shrink-0 grid-cols-1 gap-4 border-b p-5 sm:grid-cols-3"
        style={{ borderColor: 'var(--border)' }}
      >
        {NIVELES.map((n) => {
          const nivel = resumen.porNivel[n];
          const faltan = Math.max(0, nivel.requeridas - nivel.aprobadas);
          return (
            <div key={n}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{n}° nivel</span>
                <span
                  className={cx(
                    'text-sm tabular-nums',
                    nivel.cumple
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-zinc-500 dark:text-zinc-400',
                  )}
                >
                  {nivel.aprobadas} / {nivel.requeridas} hs
                </span>
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                style={{ background: 'var(--border)' }}
              >
                <div
                  className={nivel.cumple ? 'h-full bg-emerald-500' : 'h-full bg-amber-500'}
                  style={{ width: `${nivel.porcentaje}%`, transition: 'width .4s ease' }}
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                {nivel.cumple ? 'Cumplido' : `Faltan ${faltan} hs`}
                {nivel.enProgreso > 0 && ` · ${nivel.enProgreso} hs en curso`}
              </p>
            </div>
          );
        })}
      </div>

      {/* Catálogo */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          El requisito de la Ord. 1877 es por <strong>horas y por nivel</strong>: no alcanza con
          aprobar una cantidad de materias, y el excedente de un nivel no cubre el faltante de otro.
          Como en 3° todas son de 64 hs y hace falta 96, ahí necesitás dos sí o sí.
        </p>

        {NIVELES.map((n) => {
          const delNivel = grafo.electivas.filter((e) => e.nivel === n);
          const ofertadas = delNivel.reduce((acc, e) => acc + e.horasTotales, 0);
          return (
            <section key={n} className="mb-6 last:mb-0">
              <div className="mb-2.5 flex items-center gap-2">
                <h3 className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  {n}° nivel · {delNivel.length} electivas · {ofertadas} hs ofertadas
                </h3>
                <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
              </div>
              <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                {delNivel.map((electiva) => (
                  <TarjetaElectiva key={electiva.slug} electiva={electiva} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </dialog>
  );
}

function TarjetaElectiva({ electiva }: { electiva: Materia }) {
  const progreso = usarProgreso((estado) => estado.progreso);
  const grafo = useMemo(() => grafoPorDefecto(), []);
  const derivada = derivar(electiva, progreso, grafo);
  const variante = varianteDe(derivada.estado, derivada.habilitacion);

  const correlativas = [
    ...electiva.correlativas.paraCursar.regularizadas.map((id) => ({ id, exigencia: 'cursada' as const })),
    ...electiva.correlativas.paraCursar.aprobadas.map((id) => ({ id, exigencia: 'aprobada' as const })),
  ];

  const cambiar = (nuevo: EstadoMateria): void => {
    const anterior = estadoDe(usarProgreso.getState().progreso, electiva.slug);
    if (anterior === nuevo) return;
    usarProgreso.getState().marcarMateria(electiva.slug, nuevo);
    toast(electiva.nombre, {
      description: `${NOMBRE_ESTADO[anterior]} → ${NOMBRE_ESTADO[nuevo]}`,
      action: {
        label: 'Deshacer',
        onClick: () => usarProgreso.getState().marcarMateria(electiva.slug, anterior),
      },
    });
  };

  return (
    <article className={cx('rounded-xl border p-3', ESTILO_NODO[variante].contenedor)}>
      <div className="flex items-start gap-2">
        <h4 className="min-w-0 flex-1 text-sm leading-tight font-medium">{electiva.nombre}</h4>
        <span
          className="shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] whitespace-nowrap"
          style={{ borderColor: 'var(--border)' }}
          title={NOMBRE_REGIMEN[electiva.regimen]}
        >
          {TAG_REGIMEN[electiva.regimen]}
        </span>
        <span
          className={cx(
            'shrink-0 text-[11px] tabular-nums',
            electiva.horasTotales === 0 ? 'text-amber-600 dark:text-amber-400' : 'opacity-70',
          )}
          title={
            electiva.horasTotales === 0
              ? 'El Departamento no publica la carga horaria: no suma al requisito'
              : undefined
          }
        >
          {electiva.horasTotales === 0 ? 'sin hs' : `${electiva.horasTotales} hs`}
        </span>
      </div>

      {electiva.areaConocimiento !== undefined && (
        <p className="mt-1 text-[11px] opacity-60">{electiva.areaConocimiento}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        {correlativas.length === 0 ? (
          <span className="opacity-60">Sin correlativas registradas</span>
        ) : (
          correlativas.map(({ id, exigencia }) => {
            const req = grafo.porId.get(id);
            if (req === undefined) return null;
            const cumple =
              exigencia === 'aprobada'
                ? estaAprobada(progreso, req.slug)
                : estaRegularizada(progreso, req.slug);
            return (
              <span
                key={`${id}-${exigencia}`}
                className="flex items-center gap-1"
                title={`${req.nombre} — ${exigencia}`}
              >
                {cumple ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <X className="size-3 opacity-40" />
                )}
                <span className={cumple ? '' : 'opacity-60'}>
                  {id} · {req.nombre}
                </span>
              </span>
            );
          })
        )}
      </div>

      {electiva.requiereVerificacion === true && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
          <TriangleAlert className="mt-px size-3 shrink-0" />
          <span>Correlativas sin confirmar contra el PDF oficial</span>
        </p>
      )}

      <div
        className="mt-2.5 flex items-center gap-1 border-t pt-2.5"
        style={{ borderColor: 'var(--border)' }}
      >
        {ESTADOS.map(({ estado, icono: Icono, color }) => {
          const activo = derivada.estado === estado;
          return (
            <button
              key={estado}
              type="button"
              onClick={() => cambiar(estado)}
              title={NOMBRE_ESTADO[estado]}
              aria-pressed={activo}
              className={cx(
                'grid size-7 place-items-center rounded-md transition',
                activo ? cx('bg-black/10 dark:bg-white/15', color) : 'opacity-40 hover:opacity-100',
              )}
            >
              <Icono className="size-3.5" />
              <span className="sr-only">{NOMBRE_ESTADO[estado]}</span>
            </button>
          );
        })}
        <span className="ml-auto text-[11px] opacity-70">
          {derivada.habilitacion === 'bloqueada' ? 'Bloqueada' : NOMBRE_ESTADO[derivada.estado]}
        </span>
      </div>
    </article>
  );
}
