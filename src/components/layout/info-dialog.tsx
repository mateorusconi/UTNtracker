'use client';

/**
 * Diálogo de `Información`: identidad del plan, totales de carga horaria y la
 * **leyenda de los 7 estados visuales**.
 *
 * Usa el `<dialog>` nativo en vez de shadcn/ui porque en la Fase 2 todavía no
 * instalamos Radix. La Fase 3 lo reemplaza por `<Dialog>` de shadcn.
 */

import {
  CalendarX,
  Circle,
  CircleCheck,
  Hourglass,
  Lock,
  PencilLine,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef } from 'react';

import PLAN from '../../data/plan-utn-frt-isi-2023';
import { ESTILO_NODO, cx, type VarianteNodo } from '../../lib/theme';
import { Imagotipo } from './logo';

const LEYENDA: readonly { variante: VarianteNodo; icono: LucideIcon; titulo: string; detalle: string }[] =
  [
    { variante: 'disponible', icono: Circle, titulo: 'Disponible', detalle: 'Cumplís las correlativas para cursarla' },
    { variante: 'bloqueada', icono: Lock, titulo: 'Bloqueada', detalle: 'Te falta alguna correlativa' },
    { variante: 'cursando', icono: PencilLine, titulo: 'Cursando', detalle: 'La estás cursando este período' },
    { variante: 'regular', icono: Hourglass, titulo: 'Regular', detalle: 'Aprobaste la cursada, adeudás el final' },
    { variante: 'aprobada', icono: CircleCheck, titulo: 'Aprobada', detalle: 'Final aprobado' },
    { variante: 'recursa', icono: CalendarX, titulo: 'Recursa', detalle: 'Perdiste la cursada, tenés que recursarla' },
  ];

export function InfoDialog({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (abierto && !dialog.open) dialog.showModal();
    if (!abierto && dialog.open) dialog.close();
  }, [abierto]);

  const horasObligatorias = PLAN.materias
    .filter((m) => m.tipo !== 'electiva' && m.id >= 1 && m.id <= 36)
    .reduce((acc, m) => acc + m.horasTotales, 0);

  return (
    <dialog
      ref={ref}
      onClose={alCerrar}
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-2xl border p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      style={{
        background: 'var(--popover)',
        borderColor: 'var(--border)',
        color: 'var(--popover-foreground)',
      }}
    >
      <div className="flex items-start gap-3 border-b p-5" style={{ borderColor: 'var(--border)' }}>
        <div>
          <Imagotipo conBajada />
          <h3 className="mt-3 text-sm font-semibold">{PLAN.carrera}</h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {PLAN.facultad} · Plan {PLAN.plan} · {PLAN.ordenanza}
          </p>
        </div>
        <button
          type="button"
          onClick={alCerrar}
          className="ml-auto grid size-7 shrink-0 place-items-center rounded-md text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
          title="Cerrar"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-5 p-5">
        <section>
          <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            Carga horaria
          </h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <dt className="text-zinc-500 dark:text-zinc-400">36 obligatorias</dt>
            <dd className="text-right tabular-nums">{horasObligatorias} hs</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Electivas</dt>
            <dd className="text-right tabular-nums">{PLAN.requisitoElectivas.total} hs</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Práctica Profesional</dt>
            <dd className="text-right tabular-nums">200 hs</dd>
            <dt className="border-t pt-1 font-medium" style={{ borderColor: 'var(--border)' }}>
              Total
            </dt>
            <dd
              className="border-t pt-1 text-right font-medium tabular-nums"
              style={{ borderColor: 'var(--border)' }}
            >
              {horasObligatorias + PLAN.requisitoElectivas.total + 200} hs
            </dd>
          </dl>
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            Estados
          </h3>
          <ul className="space-y-1.5">
            {LEYENDA.map(({ variante, icono: Icono, titulo, detalle }) => (
              <li key={variante} className="flex items-center gap-3">
                <span
                  className={cx(
                    'grid size-7 shrink-0 place-items-center rounded-md border',
                    ESTILO_NODO[variante].contenedor,
                  )}
                >
                  <Icono className="size-3.5" />
                </span>
                <span className="text-sm font-medium">{titulo}</span>
                <span className="ml-auto text-right text-xs text-zinc-500 dark:text-zinc-400">
                  {detalle}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            Aristas
          </h3>
          <ul className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <li>
              <span className="text-zinc-900 dark:text-zinc-100">Sólida</span> — habilita la cursada
            </li>
            <li>
              <span className="text-zinc-900 dark:text-zinc-100">Punteada</span> — habilita el final
            </li>
            <li>El color sale del estado de la materia de origen</li>
            <li>
              La barrita ámbar a la izquierda marca las <strong>integradoras</strong>
            </li>
          </ul>
        </section>
      </div>
    </dialog>
  );
}
