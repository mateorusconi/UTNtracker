'use client';

/** Panel de estadísticas (§4.4). Es lo que se ve cuando no hay nada seleccionado. */

import { CircleCheck, CircleDashed, Hourglass, PencilLine, type LucideIcon } from 'lucide-react';
import { useMemo } from 'react';

import {
  estadisticas,
  grafoPorDefecto,
  horasElectivasPorNivel,
  progresoTituloIntermedio,
} from '../../lib/grafo';
import { usarMapa } from '../../store/usar-mapa';
import { usarProgreso } from '../../store/usar-progreso';
import { Anillo } from './anillo';

export function PanelEstadisticas() {
  const progreso = usarProgreso((estado) => estado.progreso);
  const grafo = useMemo(() => grafoPorDefecto(), []);

  const stats = useMemo(() => estadisticas(progreso, grafo), [progreso, grafo]);
  const titulo = useMemo(() => progresoTituloIntermedio(progreso, grafo), [progreso, grafo]);
  const electivas = useMemo(() => horasElectivasPorNivel(progreso, grafo), [progreso, grafo]);

  return (
    <>
      {/* Anillo de la carrera */}
      <div className="flex items-center gap-4 px-4 pt-4">
        <Anillo porcentaje={stats.porcentaje}>
          <span className="text-xl font-semibold tabular-nums">{Math.round(stats.porcentaje)}%</span>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">de la carrera</span>
        </Anillo>
        <div className="min-w-0 flex-1 space-y-1.5">
          <Fila icono={PencilLine} etiqueta="Cursando" valor={stats.cursando} color="text-cyan-500" />
          <Fila
            icono={Hourglass}
            etiqueta="Adeuda final"
            valor={stats.regulares}
            color="text-amber-500"
          />
          <Fila
            icono={CircleCheck}
            etiqueta="Aprobadas"
            valor={stats.aprobadas}
            color="text-emerald-500"
          />
          <Fila
            icono={CircleDashed}
            etiqueta="Restantes"
            valor={stats.restantes}
            color="text-zinc-400"
          />
        </div>
      </div>

      <p className="px-4 pt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
        {stats.aprobadas} de {stats.total} asignaturas · {stats.disponibles} disponibles para
        cursar
        {stats.finalesHabilitados > 0 && ` · ${stats.finalesHabilitados} finales habilitados`}
      </p>

      {stats.inconsistentes > 0 && (
        <p className="mx-4 mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
          {stats.inconsistentes === 1
            ? '1 materia marcada sin cumplir sus correlativas.'
            : `${stats.inconsistentes} materias marcadas sin cumplir sus correlativas.`}{' '}
          Puede ser un clic errado.
        </p>
      )}

      {/* Título intermedio */}
      <Separador>Título intermedio</Separador>
      <div className="flex items-center gap-3 px-4">
        <Anillo porcentaje={titulo.porcentaje} tamano={56} grosor={6}>
          <span className="text-[11px] font-semibold tabular-nums">
            {Math.round(titulo.porcentaje)}%
          </span>
        </Anillo>
        <div className="min-w-0">
          <p className="text-sm font-medium tabular-nums">
            {titulo.aprobadas} de {titulo.total} materias
          </p>
          <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            Analista Desarrollador/a Universitario/a
          </p>
        </div>
      </div>

      {/* Electivas: se cuentan HORAS por nivel, no materias */}
      <Separador>Electivas</Separador>
      <div className="space-y-2.5 px-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">Horas acreditadas</span>
          <span className="tabular-nums">
            {electivas.totalAprobadas} / {electivas.totalRequeridas} hs
          </span>
        </div>

        {[3, 4, 5].map((n) => {
          const nivel = electivas.porNivel[n as 3 | 4 | 5];
          return (
            <div key={n} className="space-y-1">
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">{n}° nivel</span>
                <span
                  className={
                    nivel.cumple
                      ? 'tabular-nums text-emerald-600 dark:text-emerald-400'
                      : 'tabular-nums text-zinc-500 dark:text-zinc-400'
                  }
                >
                  {nivel.aprobadas} / {nivel.requeridas} hs
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full"
                style={{ background: 'var(--border)' }}
              >
                <div
                  className={nivel.cumple ? 'h-full bg-emerald-500' : 'h-full bg-amber-500'}
                  style={{ width: `${nivel.porcentaje}%`, transition: 'width .4s ease' }}
                />
              </div>
            </div>
          );
        })}

        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          La Ord. 1877 exige horas por nivel: el excedente de uno no cubre el faltante de otro.
        </p>
      </div>

      <div className="p-4">
        <button
          type="button"
          onClick={() => usarMapa.getState().setElectivasAbiertas(true)}
          title="Catálogo de electivas habilitadas en FRT"
          className="w-full rounded-lg bg-orange-500/15 px-3 py-2 text-sm font-medium text-orange-600 transition hover:bg-orange-500/25 dark:text-orange-400"
        >
          Ver electivas
        </button>
      </div>
    </>
  );
}

function Fila({
  icono: Icono,
  etiqueta,
  valor,
  color,
}: {
  icono: LucideIcon;
  etiqueta: string;
  valor: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icono className={`size-3.5 shrink-0 ${color}`} />
      <span className="text-zinc-500 dark:text-zinc-400">{etiqueta}</span>
      <span className="ml-auto tabular-nums">{valor}</span>
    </div>
  );
}

function Separador({ children }: { children: string }) {
  return (
    <div className="mt-5 mb-3 flex items-center gap-2 px-4">
      <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
        {children}
      </span>
      <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
    </div>
  );
}
