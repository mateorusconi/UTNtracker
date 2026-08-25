'use client';

/**
 * Rail de íconos de la izquierda (§4.1), 64 px, grupos redondeados separados
 * por aire.
 *
 * Reducido a propósito respecto del prompt maestro: la app modela **un solo
 * plan**, así que no hay "carreras" ni "subir plan". Ver la sección Alcance
 * del README.
 */

import {
  BarChart3,
  CalendarClock,
  Download,
  Home,
  Network,
  Search,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import { grafoPorDefecto } from '../../lib/grafo';
import { cantidadMarcadas } from '../../lib/progreso';
import { crearRespaldo, leerRespaldo, nombreDeArchivo } from '../../lib/respaldo';
import { cx } from '../../lib/theme';
import { usarMapa } from '../../store/usar-mapa';
import { usarProgreso } from '../../store/usar-progreso';

interface ItemRail {
  icono: LucideIcon;
  etiqueta: string;
  activo?: boolean;
  onClick?: () => void;
  /** Todavía no implementado: llega en la fase indicada. */
  fase?: number;
}

export function Rail() {
  const abierto = usarMapa((estado) => estado.railAbierto);
  const panelAbierto = usarMapa((estado) => estado.panelAbierto);
  const inputArchivo = useRef<HTMLInputElement>(null);

  /**
   * Baja el avance como JSON. No hay servidor, así que el archivo se arma en
   * memoria y se descarga desde un blob: nada sale del navegador.
   */
  const descargar = (): void => {
    const progreso = usarProgreso.getState().progreso;
    const cantidad = cantidadMarcadas(progreso);

    if (cantidad === 0) {
      toast('No hay nada para exportar', {
        description: 'Marcá al menos una materia antes de descargar tu avance.',
      });
      return;
    }

    const ahora = new Date();
    const respaldo = crearRespaldo(progreso, grafoPorDefecto(), ahora);
    const nombre = nombreDeArchivo(ahora);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json' }),
    );

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);

    toast('Avance descargado', {
      description: `${cantidad} ${cantidad === 1 ? 'materia' : 'materias'} en ${nombre}.`,
    });
  };

  /** Importa un respaldo. Pisa el avance actual, siempre con deshacer. */
  const alElegirArchivo = async (evento: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const archivo = evento.target.files?.[0];
    // Se limpia para que elegir el mismo archivo dos veces vuelva a disparar.
    evento.target.value = '';
    if (archivo === undefined) return;

    const resultado = leerRespaldo(await archivo.text(), grafoPorDefecto());

    if (!resultado.ok) {
      toast.error('No pude importar el archivo', { description: resultado.error });
      return;
    }

    const anterior = usarProgreso.getState().progreso;
    usarProgreso.getState().reemplazar(resultado.progreso);

    const detalles = [
      `${resultado.importadas} ${resultado.importadas === 1 ? 'materia' : 'materias'}`,
    ];
    if (resultado.ignoradas.length > 0) {
      detalles.push(`${resultado.ignoradas.length} sin reconocer`);
    }
    if (resultado.aviso !== null) detalles.push(resultado.aviso);

    toast('Avance importado', {
      description: detalles.join(' · '),
      action: {
        label: 'Deshacer',
        onClick: () => usarProgreso.getState().reemplazar(anterior),
      },
    });
  };

  if (!abierto) return null;

  const grupos: readonly (readonly ItemRail[])[] = [
    [
      { icono: Home, etiqueta: 'Inicio', onClick: () => usarMapa.getState().seleccionar(null) },
      { icono: Download, etiqueta: 'Descargar mi avance', onClick: descargar },
      {
        icono: Upload,
        etiqueta: 'Cargar un avance guardado',
        onClick: () => inputArchivo.current?.click(),
      },
    ],
    [
      { icono: Search, etiqueta: 'Buscar materia', fase: 4 },
      { icono: Network, etiqueta: 'Mapa', activo: true },
      {
        icono: CalendarClock,
        etiqueta: 'Próximos finales',
        onClick: () => usarMapa.getState().setFinalesAbiertos(true),
      },
      {
        icono: BarChart3,
        etiqueta: 'Estadísticas',
        activo: panelAbierto,
        onClick: () => usarMapa.getState().alternarPanel(),
      },
    ],
  ];

  return (
    <nav
      className="flex w-16 shrink-0 flex-col items-center gap-3 border-r py-3"
      style={{ background: 'var(--barra)', borderColor: 'var(--border)' }}
      aria-label="Navegación principal"
    >
      <input
        ref={inputArchivo}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => void alElegirArchivo(e)}
      />

      {grupos.map((grupo, i) => (
        <div
          key={i}
          className="flex flex-col gap-1 rounded-xl p-1"
          style={{ background: 'var(--columna)' }}
        >
          {grupo.map(({ icono: Icono, etiqueta, activo, onClick, fase }) => (
            <button
              key={etiqueta}
              type="button"
              disabled={fase !== undefined}
              onClick={onClick}
              title={fase === undefined ? etiqueta : `${etiqueta} — llega en la Fase ${fase}`}
              className={cx(
                'grid size-10 place-items-center rounded-lg transition',
                activo === true
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                  : 'text-zinc-500 dark:text-zinc-400',
                fase === undefined
                  ? 'hover:bg-black/5 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-zinc-100'
                  : 'cursor-not-allowed opacity-35',
              )}
            >
              <Icono className="size-[18px]" />
              <span className="sr-only">{etiqueta}</span>
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
