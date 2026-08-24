'use client';

/**
 * Controles del canvas, abajo a la izquierda (§4.1):
 * zoom in, zoom out, fit view y el toggle de tema.
 */

import { useReactFlow } from '@xyflow/react';
import { Maximize, Minus, Moon, Plus, Sun } from 'lucide-react';

import { PADDING_ENCUADRE } from '../../lib/layout';
import { useTema } from '../tema';

const BOTON =
  'grid size-8 place-items-center text-zinc-500 transition hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100';

export function Controles() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { tema, alternar } = useTema();

  return (
    <div
      className="absolute bottom-4 left-4 z-10 flex flex-col overflow-hidden rounded-lg border backdrop-blur-md"
      style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
    >
      <button type="button" className={BOTON} onClick={() => void zoomIn()} title="Acercar">
        <Plus className="size-4" />
      </button>
      <button type="button" className={BOTON} onClick={() => void zoomOut()} title="Alejar">
        <Minus className="size-4" />
      </button>
      <button
        type="button"
        className={BOTON}
        onClick={() => void fitView({ padding: PADDING_ENCUADRE, duration: 250 })}
        title="Encuadrar todo (F)"
      >
        <Maximize className="size-4" />
      </button>
      <span className="mx-1.5 h-px" style={{ background: 'var(--border)' }} />
      <button
        type="button"
        className={BOTON}
        onClick={alternar}
        title={tema === 'oscuro' ? 'Tema claro' : 'Tema oscuro'}
      >
        {tema === 'oscuro' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    </div>
  );
}
