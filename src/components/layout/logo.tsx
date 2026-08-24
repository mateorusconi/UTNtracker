/**
 * Marca de UTrackerN.
 *
 * El isotipo es el prompt de una terminal —un chevron y un guion bajo— dibujado
 * como SVG en vez de un PNG: escala sin pixelarse, pesa nada y hereda el color
 * del tema con `currentColor`. El mismo trazo se reusa en `src/app/icon.svg`
 * para el favicon.
 */

export function Isotipo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden focusable="false">
      <path
        d="M6.2 6.4 12.6 12l-6.4 5.6"
        stroke="currentColor"
        strokeWidth={3.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15.4 17.6h4.4" stroke="currentColor" strokeWidth={3.1} strokeLinecap="round" />
    </svg>
  );
}

/**
 * Isotipo + logotipo. La `N` final va en el acento: es la de "UTN", que es lo
 * que separa este tracker de uno genérico.
 */
export function Imagotipo({ conBajada = false }: { conBajada?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <Isotipo className="size-6 shrink-0 text-orange-500" />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight">
          UTracker<span className="text-orange-500">N</span>
        </span>
        {conBajada && (
          <span className="mt-0.5 text-[9px] tracking-[0.18em] text-zinc-500 uppercase dark:text-zinc-400">
            Tu carrera. Bajo control.
          </span>
        )}
      </span>
    </span>
  );
}
