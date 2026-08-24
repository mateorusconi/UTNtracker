'use client';

/**
 * Panel de selección (§4.5). Reemplaza al de estadísticas al clickear un nodo.
 *
 * Es el diferencial de la referencia: no alcanza con decir "bloqueada", hay que
 * decir **por qué** y **qué se destraba** si la aprobás.
 */

import { Check, ChevronDown, Sparkles, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { numeroVisible, NOMBRE_ESTADO, NOMBRE_REGIMEN, TAG_REGIMEN } from '../../lib/etiquetas';
import {
  derivar,
  desbloqueaDirectamente,
  desbloqueaEnCadena,
  esDelPlan,
  grafoPorDefecto,
  materiaDe,
  requisitosDirectos,
  tieneFinal,
} from '../../lib/grafo';
import { estaAprobada, estaRegularizada } from '../../lib/progreso';
import { cx } from '../../lib/theme';
import { usarMapa } from '../../store/usar-mapa';
import { usarProgreso } from '../../store/usar-progreso';

/** Umbral a partir del cual la materia merece la caja de prioritaria (§4.5). */
const UMBRAL_PRIORITARIA = 5;

export function PanelSeleccion({ slug }: { slug: string }) {
  const progreso = usarProgreso((estado) => estado.progreso);
  const grafo = useMemo(() => grafoPorDefecto(), []);

  const materia = materiaDe(grafo, slug);
  const derivada = useMemo(() => derivar(materia, progreso, grafo), [materia, progreso, grafo]);

  const requisitos = useMemo(() => requisitosDirectos(slug, grafo), [slug, grafo]);

  // Las electivas no están en el mapa (su vista llega en la Fase 4), así que no
  // se listan como clickeables: solo se cuentan aparte.
  const hijas = useMemo(() => desbloqueaDirectamente(slug, grafo), [slug, grafo]);
  const hijasEnMapa = hijas.filter((a) => esDelPlan(materiaDe(grafo, a.hasta)));
  const hijasElectivas = hijas.length - hijasEnMapa.length;

  const enCadena = useMemo(
    () => desbloqueaEnCadena(slug, progreso, grafo).filter((s) => esDelPlan(materiaDe(grafo, s))),
    [slug, progreso, grafo],
  );

  /** Finales que le faltan para poder rendir. Solo importa si está regular. */
  const finalesFaltantes = derivada.requisitosFaltantes.filter((r) => r.para === 'rendir');

  return (
    <div className="p-4">
      <p className="text-[11px] tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
        {NOMBRE_ESTADO[derivada.estado]} · {numeroVisible(materia)}
      </p>
      <h3 className="mt-1 text-base leading-tight font-semibold">{materia.nombre}</h3>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
        <span
          className="rounded-md border px-1.5 py-0.5"
          style={{ borderColor: 'var(--border)' }}
          title={NOMBRE_REGIMEN[materia.regimen]}
        >
          {TAG_REGIMEN[materia.regimen]}
        </span>
        <span>
          {materia.nivel}° nivel · {materia.horasTotales} hs
          {materia.bloque !== undefined && ` · ${materia.bloque}`}
        </span>
      </div>

      {derivada.faltaFinalCorrelativo && (
        <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Falta final correlativo
          </p>
          <p className="mt-0.5 text-[11px] text-amber-700/80 dark:text-amber-300/80">
            Tenés la cursada, pero para rendir el final necesitás aprobar{' '}
            {finalesFaltantes.map((r) => r.materia.id).join(', ')}.
          </p>
        </div>
      )}

      {derivada.habilitacion === 'final-habilitado' && (
        <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Podés rendir el final
          </p>
        </div>
      )}

      {derivada.inconsistente && (
        <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          <p className="text-[11px] text-amber-700 dark:text-amber-300">
            La marcaste como {NOMBRE_ESTADO[derivada.estado].toLowerCase()} sin cumplir las
            correlativas para cursarla. Puede ser un clic errado.
          </p>
        </div>
      )}

      {/* MATERIA PRIORITARIA — el cuello de botella que conviene destrabar */}
      {enCadena.length > UMBRAL_PRIORITARIA && (
        <div className="mt-3 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-orange-700 uppercase dark:text-orange-300">
            <Sparkles className="size-3.5" />
            Materia prioritaria
          </p>
          <p className="mt-1 text-xs text-orange-700/90 dark:text-orange-300/90">
            Desbloquea {enCadena.length} materias en cadena para tu progreso actual.
          </p>
        </div>
      )}

      <Seccion titulo="Requisitos directos" cantidad={requisitos.length} abiertaPorDefecto>
        {requisitos.length === 0 ? (
          <p className="px-1 py-1.5 text-xs text-zinc-500 dark:text-zinc-400">Sin requisitos</p>
        ) : (
          <ul>
            {requisitos.map((arista) => {
              const req = materiaDe(grafo, arista.desde);
              const cumple =
                arista.exigencia === 'aprobada'
                  ? estaAprobada(progreso, req.slug)
                  : estaRegularizada(progreso, req.slug);
              return (
                <FilaMateria
                  key={arista.id}
                  slug={req.slug}
                  numero={numeroVisible(req)}
                  nombre={req.nombre}
                  detalle={arista.exigencia === 'aprobada' ? 'final aprobado' : 'cursada'}
                  cumple={cumple}
                />
              );
            })}
          </ul>
        )}
      </Seccion>

      {derivada.estado === 'regular' && tieneFinal(materia) && finalesFaltantes.length > 0 && (
        <Seccion titulo="Para rendir el final" cantidad={finalesFaltantes.length}>
          <ul>
            {finalesFaltantes.map((r) => (
              <FilaMateria
                key={r.materia.slug}
                slug={r.materia.slug}
                numero={numeroVisible(r.materia)}
                nombre={r.materia.nombre}
                detalle="final aprobado"
                cumple={false}
              />
            ))}
          </ul>
        </Seccion>
      )}

      <Seccion titulo="Desbloquea directamente" cantidad={hijasEnMapa.length}>
        {hijasEnMapa.length === 0 ? (
          <p className="px-1 py-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            No es correlativa de ninguna materia del plan
          </p>
        ) : (
          <ul>
            {hijasEnMapa.map((arista) => {
              const hija = materiaDe(grafo, arista.hasta);
              const derivadaHija = derivar(hija, progreso, grafo);
              return (
                <FilaMateria
                  key={arista.id}
                  slug={hija.slug}
                  numero={numeroVisible(hija)}
                  nombre={hija.nombre}
                  detalle={derivadaHija.habilitacion === 'bloqueada' ? 'bloqueada' : 'disponible'}
                  cumple={derivadaHija.habilitacion !== 'bloqueada'}
                />
              );
            })}
          </ul>
        )}
        {hijasElectivas > 0 && (
          <p className="px-1 pt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            + {hijasElectivas} {hijasElectivas === 1 ? 'electiva' : 'electivas'} (catálogo en la
            Fase 4)
          </p>
        )}
      </Seccion>

      {materia.requiereVerificacion === true && (
        <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
          Dato sin confirmar contra el PDF oficial
          {materia.notas !== undefined && `: ${materia.notas}`}
        </p>
      )}
    </div>
  );
}

function Seccion({
  titulo,
  cantidad,
  abiertaPorDefecto = false,
  children,
}: {
  titulo: string;
  cantidad: number;
  abiertaPorDefecto?: boolean;
  children: ReactNode;
}) {
  const [abierta, setAbierta] = useState(abiertaPorDefecto);

  return (
    <section className="mt-4">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-center gap-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400"
      >
        <ChevronDown
          className={cx('size-3.5 transition-transform', !abierta && '-rotate-90')}
          aria-hidden
        />
        <span>
          {titulo} {cantidad > 0 && `(${cantidad})`}
        </span>
        <span className="ml-1 h-px flex-1" style={{ background: 'var(--border)' }} />
      </button>
      {abierta && <div className="mt-1.5">{children}</div>}
    </section>
  );
}

function FilaMateria({
  slug,
  numero,
  nombre,
  detalle,
  cumple,
}: {
  slug: string;
  numero: string;
  nombre: string;
  detalle: string;
  cumple: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => usarMapa.getState().seleccionar(slug)}
        className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
      >
        {cumple ? (
          <Check className="size-3.5 shrink-0 text-emerald-500" aria-label="Cumple" />
        ) : (
          <X className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-600" aria-label="No cumple" />
        )}
        <span className="w-6 shrink-0 text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
          {numero}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs">{nombre}</span>
        <span className="shrink-0 text-[10px] text-zinc-500 dark:text-zinc-400">{detalle}</span>
      </button>
    </li>
  );
}
