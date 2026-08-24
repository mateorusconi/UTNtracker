# UTrackerN

Árbol de habilidades interactivo del plan **2023 de Ingeniería en Sistemas de Información**
de la **UTN Facultad Regional Tucumán**. El estudiante marca su avance y ve en tiempo real qué
materias se le desbloquean, qué finales tiene habilitados y cuánto le falta para el título
intermedio de Analista.

> **Estado: Fase 3 terminada.** El tracker funciona de punta a punta: marcás materias con el
> clic derecho, el grafo se recalcula, el avance se guarda en `localStorage` y los paneles de
> estadísticas y de selección están completos.

---

## Alcance

Este tracker modela **un solo plan de estudios**: Ingeniería en Sistemas de Información,
**Plan 2023** (Ord. CS N° 1877/2022) de la UTN FRT, más su título intermedio de Analista
Desarrollador/a.

Queda explícitamente **afuera**:

- El **Plan 2008** y el régimen de transición entre planes.
- Otras carreras de FRT, y el "subir plan" genérico del rail lateral del §4.1 del prompt
  maestro. El rail arranca con inicio · exportar · buscar · mapa · estadísticas; sin
  selector de carrera ni de plan. El `#2023` del panel es una etiqueta, no un desplegable.
- Equivalencias, pases y reconocimientos de materias de otras instituciones.
- La Fase 6 opcional del prompt maestro (backend multi-carrera).

No hay datos ni lógica de otros planes en el repo. Las únicas dos menciones al Plan 2008 están
en comentarios del dataset y solo citan el alcance de la Res. CD 2386/2025, que habilita las
mismas electivas para los dos planes.

---

## Comandos

```bash
npm run dev         # http://localhost:3000
npm run build       # export estático a out/
npm run validar     # valida el dataset contra las ordenanzas (15 reglas)
npm test            # 71 tests de Vitest
npm run typecheck   # tsc --noEmit, strict, sin any
npm run check       # typecheck + validar + test
```

---

## Árbol de carpetas

Lo que existe hoy (`✔`) y dónde va a caer lo de cada fase.

```
UtnFRTracker/
├── package.json                         ✔
├── tsconfig.json                        ✔  strict + noUncheckedIndexedAccess
├── vitest.config.ts                     ✔
├── next.config.ts                       ✔  output: 'export'
├── postcss.config.mjs                   ✔  Tailwind v4
├── components.json                      ✔  para futuros `npx shadcn add`
│
├── scripts/
│   └── validar-plan.ts                  ✔  corré esto antes de tocar la UI
│
├── tests/
│   ├── ayudas.ts                        ✔  habla en N° oficiales del Anexo I
│   ├── correlativas.test.ts             ✔  criterios de aceptación del §6
│   ├── reglas-especiales.test.ts        ✔  PF, PPS, Seminario, electivas
│   ├── layout.test.ts                   ✔  posiciones determinísticas
│   └── seleccion.test.ts                ✔  subgrafo resaltado
│
├── public/
│   ├── manifest.json                    ·  Fase 5
│   └── icons/                           ·  Fase 5
│
└── src/
    ├── data/
    │   └── plan-utn-frt-isi-2023.ts     ✔  DATASET SAGRADO — no se inventa nada acá
    │
    ├── lib/
    │   ├── tipos.ts                     ✔  Progreso / RegistroProgreso
    │   ├── progreso.ts                  ✔  primitivas puras sobre el avance
    │   ├── grafo.ts                     ✔  el motor de correlativas
    │   ├── layout.ts                    ✔  x = (nivel-1) × (ANCHO + GAP)
    │   ├── etiquetas.ts                 ✔  la línea meta de la tarjeta
    │   ├── theme.ts                     ✔  ACENTO y los 7 estados visuales
    │   └── demo.ts                      ✔  andamio: avance falso para ver los 7 estados
    │
    ├── store/
    │   ├── usar-progreso.ts             ✔  Zustand + persist `utrackern:v1`
    │   └── usar-mapa.ts                 ✔  selección, capas y paneles (efímero)
    │
    ├── app/
    │   ├── layout.tsx                   ✔
    │   ├── page.tsx                     ✔
    │   └── globals.css                  ✔  tokens con nombres de shadcn
    │
    └── components/
        ├── tema.tsx                     ✔  claro/oscuro (sin persistir hasta la Fase 4)
        ├── ui/
        │   └── context-menu.tsx         ✔  wrapper shadcn sobre Radix
        ├── layout/
        │   ├── topbar.tsx               ✔  identidad, capas, ejemplo, información
        │   ├── rail.tsx                 ✔  rail de 64 px
        │   └── info-dialog.tsx          ✔  totales + leyenda de estados
        ├── mapa/
        │   ├── canvas.tsx               ✔  React Flow
        │   ├── materia-node.tsx         ✔  tarjeta + menú de estados
        │   ├── correlativa-edge.tsx     ✔  color por estado, estilo por tipo
        │   ├── columnas-anio.tsx        ✔  etiquetas de año y cuatrimestre
        │   └── controles.tsx            ✔  zoom, encuadre y tema
        └── paneles/
            ├── panel-lateral.tsx        ✔  contenedor flotante
            ├── anillo.tsx               ✔  donut SVG de progreso
            ├── estadisticas.tsx         ✔  anillos y contadores
            ├── seleccion.tsx            ✔  MATERIA PRIORITARIA y requisitos
            └── electivas.tsx            ✔  catálogo de las 21 y horas por nivel
```

---

## El motor (`src/lib/grafo.ts`)

Todas las funciones son **puras**. El `Grafo` es un índice inmutable que se construye una vez
con `construirGrafo(PLAN)` y se pasa como último argumento.

### Los dos ejes

| Función | Devuelve | Regla |
|---|---|---|
| `puedeCursar(materia, progreso, grafo)` | `boolean` | Las de `paraCursar.regularizadas` están `regular` **o** `aprobada`, y las de `paraCursar.aprobadas` están `aprobada`. |
| `puedeRendirFinal(materia, progreso, grafo)` | `boolean` | La materia está `regular` **y** todas las de `paraRendir.aprobadas` están `aprobada`. `false` para la PPS. |
| `getHabilitacion(materia, progreso, grafo)` | `'disponible' \| 'bloqueada' \| 'final-habilitado' \| 'final-bloqueado'` | Deriva los cuatro estados visuales. |
| `derivar(materia, progreso, grafo)` | `MateriaDerivada` | Todo lo anterior de una pasada, más `faltaFinalCorrelativo`, `requisitosFaltantes` e `inconsistente`. |
| `derivarTodas(progreso, grafo)` | `Map<slug, MateriaDerivada>` | Un solo cálculo por cambio de progreso. |

### Topología

| Función | Devuelve |
|---|---|
| `requisitosDirectos(slug, grafo, tipos?)` | Aristas entrantes → sección `REQUISITOS DIRECTOS` |
| `desbloqueaDirectamente(slug, grafo, tipos?)` | Aristas salientes → `DESBLOQUEA DIRECTAMENTE (n)` |
| `ancestros(slug, grafo, tipos?)` | `Set<slug>` transitivo hacia arriba → resaltado `· Requisito` |
| `descendientes(slug, grafo, tipos?)` | `Set<slug>` transitivo hacia abajo → `· Desbloquea materia` |
| `desbloqueaEnCadena(slug, progreso, grafo)` | `slug[]` de lo que hoy está **bloqueado** y se destrabaría → caja `MATERIA PRIORITARIA` |
| `detectarCiclos(grafo, tipos?)` | `string[][]` — tiene que dar `[]` |

`tipos` es `['cursar']` por defecto. El grafo de `'rendir'` incluye las 35 previas de Proyecto
Final y satura la vista: por eso la capa arranca apagada (§4.3).

**Sobre `desbloqueaEnCadena`:** la simulación aprueba la materia elegida y después, en cascada,
**solo** las descendientes que van quedando habilitadas. Nunca regala requisitos de afuera de la
cadena. Por eso aprobar Algoritmos (6) con Lógica (5) y Sistemas y Procesos de Negocio (8) ya
aprobadas destraba 13, 14, 16, 19 y 20 — pero **no** Diseño de SI (23), que además exige Inglés I.
Devuelve también electivas y el Seminario; filtrá con `esDelPlan` si querés el número
"solo carrera".

### Agregados

| Función | Devuelve |
|---|---|
| `estadisticas(progreso, grafo)` | Contadores sobre **36 obligatorias + PPS = 37**. No incluye electivas ni Seminario. |
| `horasElectivasPorNivel(progreso, grafo)` | Horas aprobadas vs. 96 / 144 / 240. El excedente de un nivel **no** compensa a otro. |
| `progresoTituloIntermedio(progreso, grafo)` | Avance sobre las 24 del Analista (1..23 + Seminario). |

### Lo que se persiste

Solo `Progreso = Record<slug, { estado, nota?, fecha? }>`. Una materia ausente del record es
`pendiente`, así que el `localStorage` arranca en `{}`. **Nada derivado se guarda**: cuando se
actualice el plan, los datos viejos mentirían.

---

## El mapa (`src/lib/layout.ts` + `src/components/mapa/`)

### Layout determinístico

Nada de dagre: `calcularLayout(materias)` es una función pura, misma entrada → mismas
coordenadas. El estudiante construye memoria espacial del mapa y este no puede reacomodarse solo
entre renders.

| Constante | Valor | Qué es |
|---|---|---|
| `ANCHO_NODO` / `ALTO_NODO` | 250 / 74 | La tarjeta |
| `GAP_COLUMNAS` | 150 | Aire entre columnas (paso de 400) |
| `GAP_NODOS` | 26 | Aire vertical entre tarjetas (paso de 100) |
| `ALTO_ETIQUETA_ANIO` | 44 | Aire arriba para la etiqueta `1° Año` |

**No hay contenedor de año.** El §4.1 pedía un panel translúcido por nivel, pero React Flow dibuja
las aristas *encima* de cualquier cosa que pongamos detrás de los nodos, así que el panel quedaba
cruzado de líneas. La referencia no usa paneles: solo una etiqueta de texto arriba de cada
columna. Sin superficie, no hay nada que cruzar.

El aire salió de medir la referencia: usa 420 px entre columnas y un paso vertical de 130 para
tarjetas de 51 px —dos veces y media el alto de la tarjeta—. No pudimos igualar esa proporción
porque sus nombres entran en una línea y los nuestros necesitan dos, pero subimos el aire de 14 a
26 px.

Las 38 materias del plan quedan repartidas **8 · 8 · 8 · 7 · 7**: 3° suma el Seminario
Integrador y 5° suma la PPS. Las electivas **no** van al mapa principal — tienen su vista propia
en la Fase 4.

**El separador de `2° Cuatrimestre` está implementado pero hoy no se dibuja nunca:** en el Plan
2023 las 36 obligatorias son todas anuales. Hay un test que lo verifica y otro que comprueba que
el separador sí aparece si el nivel mezcla regímenes (usando las electivas de 3°).

### Los 7 estados visuales

Salen de `varianteDe(estado, habilitacion)` en `theme.ts`, el único archivo donde se tocan los
colores. El acento es **naranja** (`orange-500`, en `ACENTO`); el ámbar quedó reservado para el
estado `regular` y para los avisos, que son cosas distintas.

Las superficies son **sólidas**, no velos translúcidos: antes las tarjetas eran
`bg-white/[0.03]` sobre un fondo casi negro y se leían como manchas. Ahora cada estado tiene su
color de tarjeta y el color fuerte vive en el borde y el ícono. El lienzo (`#141315`) va **más
claro que la barra y el rail** (`#0c0b0d`), así el mapa se lee como la superficie de trabajo y el
chrome se hunde.

| Variante | Cuándo | Ícono |
|---|---|---|
| `aprobada` | verde | `CircleCheck` |
| `cursando` | cian + glow | `PencilLine` |
| `regular` | ámbar — la línea meta dice `Final habilitado` o `Falta final correlativo` | `Hourglass` |
| `recursa` | rojo | `CalendarX` |
| `disponible` | pendiente y con las correlativas cumplidas | `Circle` |
| `bloqueada` | pendiente y trabada, texto al 40 % | `Lock` |
| `electiva` | overlay de borde punteado violeta | badge del área |

Las **integradoras** (16, 23, 30, 36 y Seminario) llevan una barrita ámbar sobre el borde
izquierdo: son los cuellos de botella reales del plan.

### Aristas

Bezier de **1 px, sin punta de flecha**. **Color** según el estado de la materia origen; **estilo**
según para qué sirve: sólida para *cursar*, punteada para *rendir*.

Sin `markerEnd` a propósito: la punta se dibuja sobre el handle, que está pegado al borde de la
tarjeta, y con muchas aristas convergiendo en la misma materia se apilan contra el borde y
ensucian. La dirección ya la da el layout, que siempre va de izquierda a derecha. Las aristas
quedan **detrás de las tarjetas**: React Flow pinta `.react-flow__edges` antes que
`.react-flow__nodes`. La capa de *rendir* arranca
apagada y se prende desde la barra — son 150 aristas y sola la de Proyecto Final aporta 35, así
que las dos juntas son ilegibles.

Desvío del prompt: para el estado `pendiente` usamos `zinc-500` en vez de `neutral-700`, que
desaparece sobre el fondo casi negro y pesa demasiado sobre el blanco.

---

## Estado e interacción (`src/store/`)

### Dos stores, uno solo se guarda

| Store | Qué tiene | ¿Persiste? |
|---|---|---|
| `usar-progreso.ts` | `Record<slug, { estado, nota?, fecha? }>` | **Sí** — `localStorage`, clave `utrackern:v1` |
| `usar-mapa.ts` | selección, capas de aristas, panel y rail abiertos | No — se resetea en cada sesión |

El `partialize` del middleware `persist` deja pasar **solo** `progreso`. Nada derivado se guarda:
habilitaciones, estadísticas y resaltados se recalculan con las funciones puras de `grafo.ts`.

**Sobre la hidratación:** la página es un export estático prerenderizado con el avance vacío. Si
el store se rehidratara solo, el primer render del cliente no coincidiría con el HTML servido y
React tiraría un error de hidratación. Por eso el store usa `skipHydration: true` y
`useHidratarProgreso()` llama a `rehydrate()` después de montar.

### Cambiar de estado (§4.7)

Clic derecho —o *long-press* en touch, que Radix maneja solo— abre el menú con los cinco estados.
Al elegir uno sale un toast con **`Deshacer`** que guarda el estado anterior de esa materia:
marcar mal una materia y perder el estado previo es la peor fricción posible.

La PPS tiene **`Regular` deshabilitado**: no rinde final, se acredita.

### Selección (§4.6)

`calcularResaltado(slug, grafo)` devuelve el subgrafo: `requisitos` (ancestros transitivos),
`desbloquea` (descendientes) y la unión. Con eso:

- lo no relacionado baja a `opacity: .25`;
- la línea meta de los relacionados cambia a `· Requisito` / `· Desbloquea materia`;
- las aristas ajenas caen a `.12` y las del subgrafo pasan a punteadas animadas en ámbar;
- clic en el fondo o `Esc` limpia la selección.

El panel de selección lista solo materias **del plan**: las electivas no están en el mapa, así que
se cuentan aparte (`+ 3 electivas`) en vez de ofrecer un clic que no llevaría a ningún lado.

### Andamios que todavía quedan

- **Botón `Ejemplo` / `Vaciar`** en la barra: carga un avance de mentira (`src/lib/demo.ts`) para
  ver los estados y el color de las aristas, o vuelve todo a pendiente. Las dos acciones tienen
  `Deshacer`.
- **`InfoDialog` usa el `<dialog>` nativo**, no shadcn/ui. Los tokens de `globals.css` ya usan los
  nombres de shadcn, así que `npx shadcn add` va a entrar sin retoques.
- El tema claro/oscuro funciona pero **no se persiste** hasta la Fase 4.
- Los íconos de buscar y exportar del rail están deshabilitados: son de la Fase 4.

---

## Electivas (`src/components/paneles/electivas.tsx`)

Las 18 del catálogo, en un diálogo aparte que se abre con **`Ver electivas`** desde el panel de
estadísticas.

**No están en el mapa** por dos razones: no son correlativas de nada, así que colgarían de los
bordes del grafo ensuciándolo; y sobre todo porque el requisito no es aprobar N materias sino
**juntar horas por nivel**, que es una lectura de tabla y no de grafo.

Cada tarjeta muestra el nombre, el **tag de régimen** (`1° cuat.` / `2° cuat.` / `1° y 2° cuat.`),
las horas, el área, las correlativas con ✓/✗ según tu avance, el aviso si el dato viene de un PDF
escaneado, y un selector de los 5 estados. Marcar una mueve el contador de horas de su nivel al
instante — y sale con `Deshacer`, igual que en el mapa.

Arriba van los tres contadores contra 96 / 144 / 240 hs, con las horas que faltan y las que están
en curso.

Un dato que sale de mirar el catálogo: en 3° **todas** las electivas son de 64 hs y el requisito
es de 96, así que ahí hacen falta dos sí o sí. En 4° el mínimo son 2 (96 + 64 = 160) y en 5° son
3 (96 + 96 + 64 = 256). O sea, **mínimo 7 electivas** para recibirte, y hasta 9 si elegís todas
de 64.

### El tag de régimen

Aparece donde el dato varía y donde hace falta: en las tarjetas del catálogo, en el panel de
selección de cualquier materia, y en el `title` de las tarjetas del mapa.

**No va en la cara de las tarjetas del mapa** a propósito: en el Plan 2023 las 36 obligatorias son
todas anuales, así que serían 38 tarjetas repitiendo "Anual" en una línea meta que ya carga el N°
y el sufijo contextual.

---

## Salida esperada del validador

```
──────────────────────────────────────────────────────────────────────────────
VALIDADOR DE PLAN · Ingeniería en Sistemas de Información · Plan 2023
Universidad Tecnológica Nacional — Facultad Regional Tucumán · Ord. CS N° 1877/2022
──────────────────────────────────────────────────────────────────────────────

RESUMEN
  Asignaturas obligatorias .... 36
  PPS ......................... 200 hs
  Materias del plan (total) ... 38 (incluye Seminario Integrador)
  Electivas en catálogo ....... 18
  Aristas de correlatividad ... 293

CARGA HORARIA
  Nivel 1 .....................  768 hs  (8 asignaturas)
  Nivel 2 .....................  768 hs  (8 asignaturas)
  Nivel 3 .....................  648 hs  (7 asignaturas)
  Nivel 4 .....................  600 hs  (7 asignaturas)
  Nivel 5 .....................  528 hs  (6 asignaturas)
  ────────────────────────────────────────
  Obligatorias ................ 3312 hs
  Electivas ...................  480 hs
  PPS .........................  200 hs
  TOTAL ....................... 3992 hs

REGLAS (14)
  ✔ slugs-unicos
  ✔ ids-unicos
  ✔ referencias-existentes
  ✔ sin-autorreferencias
  ✔ sin-ciclos
  ✔ orden-de-niveles
  ✔ carga-horaria-obligatoria
  ✔ cantidad-de-asignaturas
  ✔ titulo-intermedio
  ✔ requisito-electivas
  ✔ smoke-disponibles-iniciales
  ⚠ rendir-incluye-cursar (3)
  ✔ horas-vs-regimen
  ⚠ requiere-verificacion (2)

  ... 5 avisos ...

──────────────────────────────────────────────────────────────────────────────
✔ DATASET VÁLIDO — 14 reglas, 0 errores, 5 avisos.
──────────────────────────────────────────────────────────────────────────────
```

Los totales de referencia del §2.5 del prompt maestro dan exactos: **3.312 + 480 + 200 = 3.992 hs**.

---

## Fuentes del dataset y avisos abiertos

Las electivas se cargaron primero desde el OCR de las Res. 2386/2025 y 1082/2026 —PDFs
escaneados, con partes ilegibles— y después se contrastaron contra la tabla
**«Correlativas Plan 2023 - Electivas»** que publica el Departamento en su página de Diseño
Curricular, que trae 21 registros.

Ese cruce resolvió 4 de los 5 `requiereVerificacion`, corrigió 3 filas y sumó 2 electivas.
Los avisos bajaron de **12 a 5**.

| Electiva | Qué cambió |
|---|---|
| Seguridad Informática | Tenía la tabla **vacía** y figuraba disponible desde el día uno. Ahora pide Análisis de SI (16) regularizada. |
| Fundamentos de Ingeniería de Datos | El OCR había sumado Paradigmas (14) como aprobada; no figura. Queda solo Algoritmos (6). |
| Diseño de Redes LAN Modernas | Suma Comunicación de Datos (21) aprobada, que el OCR no tomó. |
| Introducción al Análisis de Datos | Suma Análisis Numérico (22) regularizada y Bases de Datos (19) aprobada. |
| Ingeniería de Datos | Diseño de SI (23) va en la columna de aprobadas para cursar. |
| Sistemas de Gestión de la Calidad | Cursada confirmada tal como estaba. |
| **Heurísticas y Auto Machine Learning** (4°) · **Testing Automatizado de Software** (5°) | Nuevas. Sin área ni bloque publicados: quedan sin completar. |

### Lo que sigue abierto (5 avisos)

**Conflicto de fuentes en Auditoría en SI.** El OCR de la Res. 2386 exige 8 y 16 aprobadas; la
tabla del Departamento deja esa columna vacía. Mantenemos el criterio **más exigente**: quitar un
requisito habilitaría una inscripción que puede rebotar en la ventanilla. Marcada con
`requiereVerificacion`.

**La columna "para rendir" de las electivas no la publica nadie.** La tabla del Departamento solo
trae Regular/Aprobada para cursar. Para las filas confirmadas aplicamos la misma interpretación
que la Ord. 1878 le da a las obligatorias (ver `corr()`): para el final hay que tener todo
aprobado. Las tres que siguen sin confirmar —Seguridad en Redes, Auditoría, Agilidad— conservan lo
que dijo el OCR, y por eso el validador las sigue marcando.

**Seminario Integrador:** la carga horaria no figura en la Ord. 1911.

### Lo que NO incorporamos

La tabla del Departamento lista 21 electivas; nosotros cargamos 18. Quedaron afuera tres:

- **Gestión de Procesos de Negocio** y **Programación de Aplicaciones Distribuidas**: la tabla
  las lista sin correlativas y **sin carga horaria**. Sin horas no entran en el contador de
  96/144/240 sin inventar el dato.
- **Sistemas de Información Geográficos**: pide *"Gestión de Datos"*, que es una materia del
  **Plan 2008** (en el 2023 es Bases de Datos), y *"Todas las Materias del 2° Nivel Excepto
  Física 2"*, que es una regla y no una lista. Esa fila parece copiada de la tabla del plan viejo.

La tabla del Departamento también tiene erratas de tipeo (*"inofrmación"*, *"Infrasestructura"*,
*"Estádistica"*, *"Diseños de Sistemas"*): está mantenida a mano, no la trates como infalible.

---

## Notas técnicas

- **TypeScript 7.** Eliminó la opción `baseUrl`; los `paths` se resuelven relativos al
  `tsconfig.json`. Si en la Fase 2 alguna herramienta de Next se queja, bajá con
  `npm i -D typescript@5`.
- Los imports son **relativos** en todo el proyecto. El alias `@/*` queda configurado por si
  hace falta más adelante.
- **Next 16 + React 19 + Tailwind 4 + React Flow 12.** `next build` reescribió `jsx` a
  `react-jsx` en el `tsconfig.json`; es esperable.
- **Verificar el mapa en un navegador headless:** React Flow mide los nodos con un
  `ResizeObserver`, y en una pestaña oculta (`document.hidden`) ni ese observer ni
  `requestAnimationFrame` disparan, así que **no dibuja aristas ni encuadra**. No es un bug: hay
  que mirarlo en una ventana visible, o sacar la captura con
  `chrome --headless=new --screenshot`, que sí compone frames.

- **shadcn/ui está sin inicializar a propósito.** `npx shadcn init` reescribe `globals.css` y se
  llevaría puestos los tokens. El único componente que hizo falta hasta ahora
  (`ui/context-menu.tsx`) está escrito a mano sobre `@radix-ui/react-context-menu`, que es
  exactamente lo que shadcn copia. `components.json` ya está configurado por si querés traer más.

---

## Fuentes normativas

- **Ord. CS N° 1877/2022** — estructura curricular (carga horaria y régimen)
- **Ord. CS N° 1878/2022** — régimen de correlatividades ISI, Anexo I
- **Ord. CS N° 1910/2022** — título intermedio: Analista Desarrollador/a Universitario/a de SI
- **Ord. CS N° 1911/2022** — régimen de correlatividades del Analista, Anexo I
- **Ord. CS N° 1939/2023** — amplía el régimen de equivalencias del Analista
- **Res. CD FRT N° 2386/2025** — electivas habilitadas 2026–2029
- **Res. CD FRT N° 1082/2026** — amplía la 2386
- **Res. CD FRT N° 1064/2026** — contenidos de Diseño de Redes LAN Modernas (no cambia correlativas)
