'use client';

/**
 * Barra superior (§4.1), h-14.
 *
 *  [logo UTrackerN] [≡] │ [◈ Ingeniería en Sistemas de Información] [2023] [copiar]
 *                              ... [capas] [ejemplo] [ⓘ Información] [🎓 Mi progreso]
 */

import { Check, Copy, GraduationCap, Info, Network, PanelLeft } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import PLAN from '../../data/plan-utn-frt-isi-2023';
import { PROGRESO_DEMO } from '../../lib/demo';
import { cantidadMarcadas } from '../../lib/progreso';
import { cx } from '../../lib/theme';
import { usarMapa } from '../../store/usar-mapa';
import { usarProgreso } from '../../store/usar-progreso';
import { Imagotipo, Isotipo } from './logo';

const BOTON_ICONO =
  'grid size-8 place-items-center rounded-md text-zinc-500 transition hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100';

export function Topbar({ alAbrirInfo }: { alAbrirInfo: () => void }) {
  const capas = usarMapa((estado) => estado.capas);
  const railAbierto = usarMapa((estado) => estado.railAbierto);
  const panelAbierto = usarMapa((estado) => estado.panelAbierto);
  const progreso = usarProgreso((estado) => estado.progreso);

  const [copiado, setCopiado] = useState(false);
  const hayAvance = cantidadMarcadas(progreso) > 0;

  const copiar = (): void => {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1500);
    });
  };

  /**
   * Con el avance vacío carga un ejemplo para que se vean los estados y el
   * color de las aristas; con avance cargado, lo vacía. Siempre con deshacer:
   * es una acción destructiva de un clic.
   */
  const ejemploOVaciar = (): void => {
    const anterior = progreso;
    if (hayAvance) {
      usarProgreso.getState().reiniciar();
      toast('Avance vaciado', {
        description: 'Todas las materias volvieron a pendiente.',
        action: { label: 'Deshacer', onClick: () => usarProgreso.getState().reemplazar(anterior) },
      });
    } else {
      usarProgreso.getState().reemplazar(PROGRESO_DEMO);
      toast('Avance de ejemplo cargado', {
        description: 'Sirve para ver los estados y las aristas en acción.',
        action: { label: 'Deshacer', onClick: () => usarProgreso.getState().reemplazar(anterior) },
      });
    }
  };

  return (
    <header
      className="flex h-14 shrink-0 items-center gap-2 border-b px-3"
      style={{ background: 'var(--barra)', borderColor: 'var(--border)' }}
    >
      <span className="hidden sm:inline">
        <Imagotipo />
      </span>
      <span className="sm:hidden">
        <Isotipo className="size-6 text-orange-500" />
      </span>

      <button
        type="button"
        onClick={() => usarMapa.getState().alternarRail()}
        className={BOTON_ICONO}
        title={railAbierto ? 'Ocultar barra lateral' : 'Mostrar barra lateral'}
        aria-pressed={railAbierto}
      >
        <PanelLeft className="size-4" />
      </button>

      <span className="mx-1 h-6 w-px" style={{ background: 'var(--border)' }} />

      <Network className="size-4 shrink-0 text-orange-600 dark:text-orange-400" />
      <span className="truncate text-sm font-medium">{PLAN.carrera}</span>
      <span
        className="shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] text-zinc-500 dark:text-zinc-400"
        style={{ borderColor: 'var(--border)' }}
      >
        {PLAN.plan}
      </span>
      <button type="button" onClick={copiar} className={BOTON_ICONO} title="Copiar enlace">
        {copiado ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* Capas de correlativas (§4.3). Por defecto solo `cursar`: mostrar las
            dos juntas es ilegible. */}
        <div
          className="hidden overflow-hidden rounded-md border text-[11px] md:flex"
          style={{ borderColor: 'var(--border)' }}
        >
          <Interruptor
            activo={capas.cursar}
            onClick={() => usarMapa.getState().alternarCapa('cursar')}
            titulo="Correlativas para cursar (línea sólida)"
          >
            Cursar
          </Interruptor>
          <Interruptor
            activo={capas.rendir}
            onClick={() => usarMapa.getState().alternarCapa('rendir')}
            titulo="Correlativas para rendir el final (línea punteada)"
          >
            Rendir
          </Interruptor>
        </div>

        <button
          type="button"
          onClick={ejemploOVaciar}
          title={
            hayAvance
              ? 'Volver todas las materias a pendiente'
              : 'Cargar un avance de ejemplo para ver los estados'
          }
          className="rounded-md border px-2.5 py-1.5 text-[11px] text-zinc-500 transition hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10"
          style={{ borderColor: 'var(--border)' }}
        >
          {hayAvance ? 'Vaciar' : 'Ejemplo'}
        </button>

        <button type="button" onClick={alAbrirInfo} className={BOTON_ICONO} title="Información">
          <Info className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => usarMapa.getState().alternarPanel()}
          aria-pressed={panelAbierto}
          title="Mi progreso"
          className={cx(
            BOTON_ICONO,
            panelAbierto && 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
          )}
        >
          <GraduationCap className="size-4" />
        </button>
      </div>
    </header>
  );
}

function Interruptor({
  activo,
  onClick,
  titulo,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-pressed={activo}
      className={cx(
        'px-2.5 py-1.5 transition',
        activo
          ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
          : 'text-zinc-500 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10',
      )}
    >
      {children}
    </button>
  );
}
