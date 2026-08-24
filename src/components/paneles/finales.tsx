'use client';

/**
 * ============================================================================
 *  PRÓXIMOS FINALES
 * ============================================================================
 *
 *  Dos preguntas en una pantalla: **cuándo es la próxima mesa** y **qué final
 *  conviene rendir**.
 *
 *  Lo que todavía NO hace: decir en qué mesa cae cada materia. La distribución
 *  que circula está en nombres del Plan 2008 y traducirla sería inventar. Se
 *  avisa en el pie del diálogo en vez de simularlo.
 * ============================================================================
 */

import { CalendarClock, Check, ChevronRight, Hourglass, TriangleAlert, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { CICLO_LECTIVO } from '../../data/mesas-2026';
import { numeroVisible } from '../../lib/etiquetas';
import { grafoPorDefecto } from '../../lib/grafo';
import {
  llamadosPendientes,
  parsearFecha,
  resumenDeFinales,
  type FinalPendiente,
  type LlamadoDerivado,
  type MesaDerivada,
} from '../../lib/mesas';
import { cx } from '../../lib/theme';
import { usarMapa } from '../../store/usar-mapa';
import { usarProgreso } from '../../store/usar-progreso';

const ROMANOS = ['', 'I', 'II', 'III'] as const;

/** `2026-09-07` → `07/09`. */
function ddmm(iso: string): string {
  const f = parsearFecha(iso);
  return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}`;
}

/** Días → texto humano. `0` es hoy, no "en 0 días". */
function enDias(dias: number): string {
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  if (dias > 1) return `en ${dias} días`;
  if (dias === -1) return 'ayer';
  return `hace ${-dias} días`;
}

export function DialogoFinales() {
  const abierto = usarMapa((estado) => estado.finalesAbiertos);
  const progreso = usarProgreso((estado) => estado.progreso);
  const grafo = useMemo(() => grafoPorDefecto(), []);

  const ref = useRef<HTMLDialogElement>(null);

  /**
   * La fecha se resuelve después de montar. La página es un export estático:
   * si tomáramos `new Date()` durante el render, el HTML prerenderizado
   * llevaría la fecha del build y no coincidiría con la del cliente.
   */
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => setAhora(new Date()), []);

  useEffect(() => {
    const dialogo = ref.current;
    if (dialogo === null) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  const resumen = useMemo(() => resumenDeFinales(progreso, grafo), [progreso, grafo]);
  const llamados = useMemo(
    () => (ahora === null ? [] : llamadosPendientes(ahora).slice(0, 3)),
    [ahora],
  );

  const cerrar = (): void => usarMapa.getState().setFinalesAbiertos(false);
  const proximo = llamados[0];

  return (
    <dialog
      ref={ref}
      onClose={cerrar}
      className="m-auto flex max-h-[85vh] w-[min(52rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
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
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <CalendarClock className="size-4 text-orange-500" />
            Próximos finales
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Mesas del ciclo lectivo {CICLO_LECTIVO} · Secretaría de Asuntos Estudiantiles
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

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {/* ── Calendario ─────────────────────────────────────────────────── */}
        {ahora === null ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Calculando fechas…</p>
        ) : proximo === undefined ? (
          <p className="rounded-lg border px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400" style={{ borderColor: 'var(--border)' }}>
            No quedan mesas del ciclo {CICLO_LECTIVO}. Cuando publiquen el calendario del año que
            viene hay que actualizar <code>src/data/mesas-2026.ts</code>.
          </p>
        ) : (
          <>
            <Encabezado>Próximo llamado</Encabezado>
            <BloqueLlamado llamado={proximo} destacado />

            {llamados.length > 1 && (
              <>
                <Encabezado>Después</Encabezado>
                <div className="space-y-2">
                  {llamados.slice(1).map((l) => (
                    <BloqueLlamado key={l.llamado} llamado={l} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Tus finales ────────────────────────────────────────────────── */}
        <Encabezado>Tus finales</Encabezado>

        {resumen.habilitados.length === 0 && resumen.bloqueados.length === 0 ? (
          <p
            className="rounded-lg border px-3 py-2.5 text-xs text-zinc-500 dark:text-zinc-400"
            style={{ borderColor: 'var(--border)' }}
          >
            No tenés materias en estado <strong>regular</strong>. Marcá con clic derecho las que
            tengas la cursada aprobada y adeudes el final, y acá te va a decir cuáles podés rendir y
            cuál conviene priorizar.
          </p>
        ) : (
          <>
            {resumen.prioritario !== null && (
              <div className="mb-3 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2.5">
                <p className="text-[11px] font-semibold tracking-wider text-orange-700 uppercase dark:text-orange-300">
                  Empezá por este
                </p>
                <p className="mt-1 text-xs text-orange-700/90 dark:text-orange-300/90">
                  <strong>{resumen.prioritario.materia.nombre}</strong> es el que más te destraba:{' '}
                  {describirImpacto(resumen.prioritario)}.
                </p>
              </div>
            )}

            {resumen.habilitados.length > 0 && (
              <>
                <Subtitulo icono="ok">Podés rendir ({resumen.habilitados.length})</Subtitulo>
                <ul className="mb-4 space-y-1.5">
                  {resumen.habilitados.map((f) => (
                    <FilaFinal key={f.materia.slug} final={f} />
                  ))}
                </ul>
              </>
            )}

            {resumen.bloqueados.length > 0 && (
              <>
                <Subtitulo icono="espera">
                  Te falta un final correlativo ({resumen.bloqueados.length})
                </Subtitulo>
                <ul className="space-y-1.5">
                  {resumen.bloqueados.map((f) => (
                    <FilaFinal key={f.materia.slug} final={f} />
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        <p className="mt-5 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          <span>
            Todavía no sabemos <strong>en qué mesa</strong> cae cada materia: la única distribución
            que circula está escrita con nombres del Plan 2008. Confirmá la mesa en el Departamento
            antes de anotarte.
          </span>
        </p>
      </div>
    </dialog>
  );
}

function describirImpacto(final: FinalPendiente): string {
  const partes: string[] = [];
  if (final.desbloqueaCursadas.length > 0) {
    partes.push(
      final.desbloqueaCursadas.length === 1
        ? 'te habilita 1 materia para cursar'
        : `te habilita ${final.desbloqueaCursadas.length} materias para cursar`,
    );
  }
  if (final.destrabaFinales.length > 0) {
    partes.push(
      final.destrabaFinales.length === 1
        ? 'te destraba 1 final'
        : `te destraba ${final.destrabaFinales.length} finales`,
    );
  }
  return partes.join(' y ');
}

function BloqueLlamado({
  llamado,
  destacado = false,
}: {
  llamado: LlamadoDerivado;
  destacado?: boolean;
}) {
  return (
    <div
      className={cx(
        'rounded-xl border p-3',
        destacado && 'border-orange-500/40 bg-orange-500/[0.06]',
      )}
      style={destacado ? undefined : { borderColor: 'var(--border)' }}
    >
      <p className="mb-2 text-sm font-medium">{llamado.llamado}° llamado</p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        {llamado.mesas.map((mesa) => (
          <FilaMesa key={mesa.mesa} mesa={mesa} />
        ))}
      </div>
    </div>
  );
}

function FilaMesa({ mesa }: { mesa: MesaDerivada }) {
  const abierta = mesa.estado === 'inscripcion-abierta';

  return (
    <div
      className="rounded-lg border px-2.5 py-2"
      style={{ borderColor: 'var(--border)', background: 'var(--columna)' }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium">Mesa {ROMANOS[mesa.mesa]}</span>
        <span className="text-[11px] tabular-nums opacity-60">{ddmm(mesa.examen)}</span>
      </div>
      <p
        className={cx(
          'mt-1 text-[11px]',
          abierta ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-500',
        )}
      >
        {abierta ? (
          <>Inscripción cierra {enDias(mesa.diasHastaCierre)}</>
        ) : (
          <>Inscripción cerrada</>
        )}
      </p>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        Examen {enDias(mesa.diasHastaExamen)}
      </p>
    </div>
  );
}

function FilaFinal({ final }: { final: FinalPendiente }) {
  const impacto = describirImpacto(final);

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          usarMapa.getState().seleccionar(final.materia.slug);
          usarMapa.getState().setFinalesAbiertos(false);
        }}
        className="flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
        style={{ borderColor: 'var(--border)' }}
        title="Ver en el mapa"
      >
        <span className="mt-0.5 w-6 shrink-0 text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
          {numeroVisible(final.materia)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm leading-tight font-medium">{final.materia.nombre}</span>
          {final.puedeRendir ? (
            impacto !== '' && (
              <span className="mt-0.5 block text-[11px] text-zinc-500 dark:text-zinc-400">
                Si lo aprobás, {impacto}.
              </span>
            )
          ) : (
            <span className="mt-0.5 block text-[11px] text-amber-700 dark:text-amber-400">
              Necesitás aprobar {final.faltan.map((m) => numeroVisible(m)).join(', ')} —{' '}
              {final.faltan.map((m) => m.nombre).join(', ')}
            </span>
          )}
        </span>
        <ChevronRight className="mt-0.5 size-4 shrink-0 opacity-40" />
      </button>
    </li>
  );
}

function Encabezado({ children }: { children: string }) {
  return (
    <div className="mt-5 mb-2.5 flex items-center gap-2 first:mt-0">
      <h3 className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
        {children}
      </h3>
      <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
    </div>
  );
}

function Subtitulo({ icono, children }: { icono: 'ok' | 'espera'; children: ReactNode }) {
  return (
    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
      {icono === 'ok' ? (
        <Check className="size-3.5 text-emerald-500" />
      ) : (
        <Hourglass className="size-3.5 text-amber-500" />
      )}
      {children}
    </p>
  );
}
