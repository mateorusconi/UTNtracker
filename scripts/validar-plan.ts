/**
 * ============================================================================
 *  VALIDADOR DEL DATASET — correlo antes de tocar la UI
 * ============================================================================
 *
 *    npm run validar
 *
 *  Si esto sale en rojo, cualquier cosa que dibujemos arriba va a mentir.
 *  Devuelve exit code 1 ante el primer ERROR (los AVISOS no rompen el build:
 *  marcan datos que vienen de PDFs escaneados y hay que confirmar en el
 *  Departamento).
 * ============================================================================
 */

import PLAN, { type Materia } from '../src/data/plan-utn-frt-isi-2023';
import { ASIGNACIONES, SIN_MESA_PUBLICADA } from '../src/data/mesas-materias';
import {
  ASIGNATURAS_OBLIGATORIAS_ESPERADAS,
  HORAS_OBLIGATORIAS_ESPERADAS,
  ID_CENTINELA_ELECTIVA,
  ID_PPS,
  construirGrafo,
  derivarTodas,
  detectarCiclos,
  esAsignaturaObligatoria,
  esDeIngenieria,
  tieneFinal,
  type Grafo,
} from '../src/lib/grafo';
import { PROGRESO_VACIO } from '../src/lib/progreso';

// ─────────────────────────────────────────────────────────────────────────────
// INFRAESTRUCTURA DEL REPORTE
// ─────────────────────────────────────────────────────────────────────────────

type Severidad = 'error' | 'aviso';

interface Hallazgo {
  severidad: Severidad;
  regla: string;
  mensaje: string;
}

const hallazgos: Hallazgo[] = [];
const reglasCorridas: string[] = [];

function regla(nombre: string, fn: () => void): void {
  reglasCorridas.push(nombre);
  fn();
}

function error(regla: string, mensaje: string): void {
  hallazgos.push({ severidad: 'error', regla, mensaje });
}

function aviso(regla: string, mensaje: string): void {
  hallazgos.push({ severidad: 'aviso', regla, mensaje });
}

/** `19 Bases de Datos` — cómo nombramos una materia en el reporte. */
function ref(m: Materia): string {
  const numero = m.id === ID_CENTINELA_ELECTIVA ? m.slug : String(m.id).padStart(2, ' ');
  return `${numero} ${m.nombre}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// REGLAS
// ─────────────────────────────────────────────────────────────────────────────

const grafo: Grafo = construirGrafo(PLAN);

regla('slugs-unicos', () => {
  const vistos = new Map<string, Materia>();
  for (const m of grafo.todas) {
    const previo = vistos.get(m.slug);
    if (previo !== undefined) {
      error('slugs-unicos', `slug repetido "${m.slug}": ${ref(previo)} y ${ref(m)}`);
    }
    vistos.set(m.slug, m);
  }
});

regla('ids-unicos', () => {
  const vistos = new Map<number, Materia>();
  for (const m of grafo.materias) {
    if (m.id === ID_CENTINELA_ELECTIVA) {
      error('ids-unicos', `${ref(m)} usa el id centinela 0, reservado para electivas`);
      continue;
    }
    const previo = vistos.get(m.id);
    if (previo !== undefined) {
      error('ids-unicos', `id ${m.id} repetido: "${previo.nombre}" y "${m.nombre}"`);
    }
    vistos.set(m.id, m);
  }
});

regla('referencias-existentes', () => {
  for (const r of grafo.referenciasRotas) {
    error(
      'referencias-existentes',
      `"${r.slug}" exige la materia ${r.idInexistente} (${r.tipo}/${r.exigencia}), que no existe en el plan`,
    );
  }
});

regla('sin-autorreferencias', () => {
  for (const a of grafo.aristas) {
    if (a.desde === a.hasta) {
      error('sin-autorreferencias', `"${a.hasta}" se exige a sí misma como correlativa (${a.tipo})`);
    }
  }
});

regla('sin-ciclos', () => {
  for (const ciclo of detectarCiclos(grafo)) {
    error('sin-ciclos', `ciclo de correlativas: ${ciclo.join(' → ')}`);
  }
});

regla('orden-de-niveles', () => {
  for (const a of grafo.aristas) {
    const requisito = grafo.porSlug.get(a.desde);
    const materia = grafo.porSlug.get(a.hasta);
    if (requisito === undefined || materia === undefined) continue;
    if (requisito.nivel > materia.nivel) {
      error(
        'orden-de-niveles',
        `${ref(materia)} (nivel ${materia.nivel}) depende de ${ref(requisito)} (nivel ${requisito.nivel}), que es de un nivel superior`,
      );
    }
  }
});

regla('carga-horaria-obligatoria', () => {
  const obligatorias = grafo.materias.filter(esAsignaturaObligatoria);
  const horas = obligatorias.reduce((acc, m) => acc + m.horasTotales, 0);
  if (horas !== HORAS_OBLIGATORIAS_ESPERADAS) {
    error(
      'carga-horaria-obligatoria',
      `las asignaturas obligatorias suman ${horas} hs y deberían sumar ${HORAS_OBLIGATORIAS_ESPERADAS} hs (Ord. 1877)`,
    );
  }
});

regla('cantidad-de-asignaturas', () => {
  const obligatorias = grafo.materias.filter(esAsignaturaObligatoria);
  if (obligatorias.length !== ASIGNATURAS_OBLIGATORIAS_ESPERADAS) {
    error(
      'cantidad-de-asignaturas',
      `hay ${obligatorias.length} asignaturas obligatorias y deberían ser ${ASIGNATURAS_OBLIGATORIAS_ESPERADAS}`,
    );
  }
  const pps = grafo.porId.get(ID_PPS);
  if (pps === undefined) {
    error('cantidad-de-asignaturas', 'falta la Práctica Profesional Supervisada (id 37)');
  } else if (pps.horasTotales !== 200) {
    error(
      'cantidad-de-asignaturas',
      `la PPS tiene ${pps.horasTotales} hs y debería tener 200 (Ord. 1877)`,
    );
  }
});

regla('titulo-intermedio', () => {
  const ids = grafo.plan.tituloIntermedio.materias;
  if (ids.length !== 24) {
    error('titulo-intermedio', `el título intermedio lista ${ids.length} materias y deberían ser 24`);
  }
  const requeridas = new Set<number>();
  for (const id of ids) {
    if (grafo.porId.get(id) === undefined) {
      error('titulo-intermedio', `la materia ${id} del título intermedio no existe en el plan`);
    }
    requeridas.add(id);
  }
  // La bandera `cuentaParaAnalista` tiene que decir exactamente lo mismo.
  for (const m of grafo.materias) {
    const marcada = m.cuentaParaAnalista === true;
    const listada = requeridas.has(m.id);
    if (marcada !== listada) {
      error(
        'titulo-intermedio',
        `${ref(m)}: cuentaParaAnalista=${marcada} pero ${listada ? 'SÍ' : 'NO'} está en tituloIntermedio.materias`,
      );
    }
  }
});

regla('requisito-electivas', () => {
  const r = grafo.plan.requisitoElectivas;
  const suma = r.nivel3 + r.nivel4 + r.nivel5;
  if (suma !== r.total) {
    error('requisito-electivas', `${r.nivel3}+${r.nivel4}+${r.nivel5} = ${suma} ≠ total ${r.total}`);
  }
  if (r.total !== 480) {
    error('requisito-electivas', `el total de electivas es ${r.total} hs y debería ser 480 (Ord. 1877)`);
  }

  // La oferta de FRT tiene que poder cubrir el requisito de cada nivel.
  for (const nivel of [3, 4, 5] as const) {
    const ofertadas = grafo.electivas
      .filter((e) => e.nivel === nivel)
      .reduce((acc, e) => acc + e.horasTotales, 0);
    const requeridas = nivel === 3 ? r.nivel3 : nivel === 4 ? r.nivel4 : r.nivel5;
    if (ofertadas < requeridas) {
      error(
        'requisito-electivas',
        `nivel ${nivel}: la oferta suma ${ofertadas} hs y el plan exige ${requeridas} hs`,
      );
    }
  }
});

regla('smoke-disponibles-iniciales', () => {
  const derivadas = derivarTodas(PROGRESO_VACIO, grafo);
  const disponibles = grafo.materias
    .filter((m) => derivadas.get(m.slug)?.habilitacion === 'disponible')
    .map(ref);
  if (disponibles.length !== 9) {
    error(
      'smoke-disponibles-iniciales',
      `con todo pendiente hay ${disponibles.length} materias disponibles y deberían ser 9 ` +
        `(las 8 de nivel 1 + Ingeniería y Sociedad):\n      ${disponibles.join('\n      ')}`,
    );
  }
});

// ── AVISOS: datos que conviene confirmar, pero que no rompen el motor ────────

regla('rendir-incluye-cursar', () => {
  for (const m of grafo.todas) {
    if (!tieneFinal(m)) continue;
    const paraRendir = new Set(m.correlativas.paraRendir.aprobadas);
    const paraCursar = [
      ...m.correlativas.paraCursar.regularizadas,
      ...m.correlativas.paraCursar.aprobadas,
    ];
    const ausentes = paraCursar.filter((id) => !paraRendir.has(id));
    if (ausentes.length > 0) {
      aviso(
        'rendir-incluye-cursar',
        `${ref(m)}: exige ${ausentes.join(', ')} para cursar pero no para rendir`,
      );
    }
  }
});

regla('horas-vs-regimen', () => {
  for (const m of grafo.todas) {
    if (m.horasSemanales === 0) continue; // la PPS se mide en horas totales
    const semanas = m.regimen === 'anual' ? 24 : 16;
    const esperadas = m.horasSemanales * semanas;
    if (m.horasTotales !== esperadas) {
      aviso(
        'horas-vs-regimen',
        `${ref(m)}: ${m.horasSemanales} hs/sem × ${semanas} sem (${m.regimen}) = ${esperadas} hs, pero el dataset dice ${m.horasTotales} hs`,
      );
    }
  }
});

regla('electivas-sin-carga-horaria', () => {
  for (const e of grafo.electivas) {
    if (e.horasTotales > 0) continue;
    aviso(
      'electivas-sin-carga-horaria',
      `${ref(e)}: el catálogo del Departamento no publica su carga horaria, así que no suma al requisito de ${grafo.plan.requisitoElectivas.total} hs`,
    );
  }
});

regla('asignacion-de-mesas', () => {
  const claves = ASIGNACIONES.map((a) => a.materia);
  if (new Set(claves).size !== claves.length) {
    error('asignacion-de-mesas', 'hay una materia asignada a más de una mesa');
  }

  for (const a of ASIGNACIONES) {
    const existe =
      typeof a.materia === 'number' ? grafo.porId.has(a.materia) : grafo.porSlug.has(a.materia);
    if (!existe) {
      error(
        'asignacion-de-mesas',
        `la mesa ${a.mesa} asigna "${a.comoFigura}" a ${a.materia}, que no existe en el plan`,
      );
    }
  }

  const interpretadas = ASIGNACIONES.filter((a) => a.confianza === 'interpretada');
  if (interpretadas.length > 0) {
    aviso(
      'asignacion-de-mesas',
      `${interpretadas.length} de ${ASIGNACIONES.length} asignaciones a mesa son lectura nuestra de nombres del Plan 2008, no transcripción`,
    );
  }
  if (SIN_MESA_PUBLICADA.length > 0) {
    aviso(
      'asignacion-de-mesas',
      `${SIN_MESA_PUBLICADA.length} materias no figuran en ninguna mesa del listado: ${SIN_MESA_PUBLICADA.join(', ')}`,
    );
  }
});

regla('requiere-verificacion', () => {
  for (const m of grafo.todas) {
    if (m.requiereVerificacion !== true) continue;
    aviso('requiere-verificacion', `${ref(m)}${m.notas === undefined ? '' : ` — ${m.notas}`}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SALIDA
// ─────────────────────────────────────────────────────────────────────────────

const errores = hallazgos.filter((h) => h.severidad === 'error');
const avisos = hallazgos.filter((h) => h.severidad === 'aviso');

const linea = '─'.repeat(78);

console.log(linea);
console.log(`VALIDADOR DE PLAN · ${PLAN.carrera} · Plan ${PLAN.plan}`);
console.log(`${PLAN.universidad} — ${PLAN.facultad} · ${PLAN.ordenanza}`);
console.log(linea);

// Resumen del dataset.
const obligatorias = grafo.materias.filter(esAsignaturaObligatoria);
const horasObligatorias = obligatorias.reduce((acc, m) => acc + m.horasTotales, 0);
const pps = grafo.porId.get(ID_PPS);
const horasPps = pps?.horasTotales ?? 0;

console.log('');
console.log('RESUMEN');
console.log(`  Asignaturas obligatorias .... ${obligatorias.length}`);
console.log(`  PPS ......................... ${pps === undefined ? '—' : `${horasPps} hs`}`);
console.log(`  Materias del plan (total) ... ${grafo.materias.length} (incluye Seminario Integrador)`);
console.log(`  Electivas en catálogo ....... ${grafo.electivas.length}`);
console.log(`  Aristas de correlatividad ... ${grafo.aristas.length}`);
console.log(
  `    · para cursar ............. ${grafo.aristas.filter((a) => a.tipo === 'cursar').length}`,
);
console.log(
  `    · para rendir ............. ${grafo.aristas.filter((a) => a.tipo === 'rendir').length}`,
);

console.log('');
console.log('CARGA HORARIA');
for (const nivel of [1, 2, 3, 4, 5] as const) {
  const delNivel = grafo.materias.filter((m) => esDeIngenieria(m) && m.nivel === nivel);
  const hs = delNivel.filter(esAsignaturaObligatoria).reduce((acc, m) => acc + m.horasTotales, 0);
  console.log(
    `  Nivel ${nivel} ..................... ${String(hs).padStart(4)} hs  (${delNivel.filter(esAsignaturaObligatoria).length} asignaturas)`,
  );
}
console.log(`  ${'─'.repeat(40)}`);
console.log(`  Obligatorias ................ ${String(horasObligatorias).padStart(4)} hs`);
console.log(`  Electivas ................... ${String(PLAN.requisitoElectivas.total).padStart(4)} hs`);
console.log(`  PPS ......................... ${String(horasPps).padStart(4)} hs`);
console.log(
  `  TOTAL ....................... ${String(horasObligatorias + PLAN.requisitoElectivas.total + horasPps).padStart(4)} hs`,
);

console.log('');
console.log(`REGLAS (${reglasCorridas.length})`);
for (const nombre of reglasCorridas) {
  const propios = hallazgos.filter((h) => h.regla === nombre);
  const conError = propios.some((h) => h.severidad === 'error');
  const marca = conError ? '✖' : propios.length > 0 ? '⚠' : '✔';
  const detalle = propios.length > 0 ? ` (${propios.length})` : '';
  console.log(`  ${marca} ${nombre}${detalle}`);
}

if (avisos.length > 0) {
  console.log('');
  console.log(`AVISOS (${avisos.length}) — datos a confirmar en el Departamento`);
  for (const a of avisos) console.log(`  ⚠ [${a.regla}] ${a.mensaje}`);
}

if (errores.length > 0) {
  console.log('');
  console.log(`ERRORES (${errores.length})`);
  for (const e of errores) console.log(`  ✖ [${e.regla}] ${e.mensaje}`);
}

console.log('');
console.log(linea);
if (errores.length === 0) {
  console.log(`✔ DATASET VÁLIDO — ${reglasCorridas.length} reglas, 0 errores, ${avisos.length} avisos.`);
  console.log(linea);
  process.exit(0);
} else {
  console.log(`✖ DATASET INVÁLIDO — ${errores.length} errores, ${avisos.length} avisos.`);
  console.log(linea);
  process.exit(1);
}
