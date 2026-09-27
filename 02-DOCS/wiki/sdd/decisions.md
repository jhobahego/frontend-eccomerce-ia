# SDD decisions

## 2026-09-26 — spec paraguas `frontend-ecommerce-ia` (draft)

- Alcance: una spec paraguas (no 6 specs separadas de entrada) porque los dominios comparten sesión, cesta y roles; la descomposición en sub-specs se deja a `plan`/`tasks` (autenticación·catálogo·cesta·pedidos·admin·shell-IA).
- Frontera respondida: IA = solo reservada en v1 (la API no expone IA) · frontal único cliente+admin mínimo con guards · cesta invitada con fusión al login · flujo gated (parar por fase, sin autopilot).
- Enfoques considerados: (A, recomendado) paraguas + sub-specs incrementales — más artefactos, riesgo bajo y verify por dominio; (B) monolito single-plan big-bang — más rápido en papel, plan inmenso y verify frágil; (C) solo storefront y admin diferido — recorta antes de tiempo y contradice la decisión explícita, descartado.
- Riesgos registrados en la spec: sin `constitution.md` ni `config.yaml` — recomendar `constitution` + `sdd-init` antes de `plan`; pagos solo informativos; moneda/importes tal cual API;shell IA sin contrato real (área no formulable).
- Skills: mapeo pedido por el usuario registrado solo en Anexo A informativo (no es contrato) para no contaminar el WHAT/WHY; el `plan` lo convertirá en estrategia.

## 2026-09-26 — `clarify` de `frontend-ecommerce-ia` (→ clarified)

- Spec aprobada por el usuario tras lectura; pasa a `clarify` en flujo gated.
- Taxonomía recorrida (10 categorías): 4 preguntas abiertas preguntadas y resueltas — stock bajo solo admin · reorden diferido · validación de disponibilidad obligatoria y bloqueante · seguimiento privado dueño+admin; 1 área graduada de datos/estado — invitado que vuelve conserva cesta en el mismo navegador; 4 supuestos validados y mantenidos; 2 diferidas intactas (+reorden añadido); 2 no-formulables sin graduar (IA, SEO).
- Por defecto propuesto sin pregunta: retirar con dependencias exige confirmación explícita (criterio añadido).
- Re-read tras hornear: sin huecos nuevos. Recomendación previa a `plan`: `constitution` + `sdd-init` (siguen faltando).

## 2026-09-26 — constitution v1.0.0 ratificada + plan `frontend-ecommerce-ia` (draft)

- Constitution ratificada explícitamente por el usuario; entra en vigor (16 principios + DoD).
- Decisiones de plan: SPA único con áreas por rol (spec lo fija; partirlo rompería fusión/sesión) · refresh de vuelo único en cliente (evita doble refresh en ráfagas 401) · totales/stock/estados autoritativos del servidor, cliente sin aritmética de importes · e2e contra stubs verificados por contract tests + snapshot openapi (determinista sin backend vivo) · secuencia en 9 pasos con fan-out #2&#3, #6&#7, #8 tras #1.
- 7 riesgos rankeados con mitigación; abiertas: `VITE_API_URL` por entorno y stub-vs-live (recomendado stub).

## 2026-09-26 — tasks `frontend-ecommerce-ia` (15 tareas) + rama `feat/frontend-ecommerce-ia`

- Aislamiento elegido: rama `feat/<slug>` (solo, sin servidor vivo encima); base verificada contra `origin/main` (idéntica, sin fetch pendiente). Sin commits aún — solo creación de rama.
- Despiece TDD en 15 tareas con done-checks ejecutables (`vitest run`, `playwright --project=chromium`, `type-check`, lint, build); `[P]` solo con ficheros disjuntos vía convención route-tables por dominio; fan-out real tras T002 (T003+T004) y tras T003+T004 (T005+T006+T007).
- Stub-vs-live **cerrada**: stub verificado por contract tests; smoke live opcional, nunca puerta.
- Forecast: ~4-6k líneas, 45-60 ficheros, riesgo medium-high → `ask-on-risk` con PRs por hito sobre la rama.

## 2026-09-26 — retoques post-analyze (gate BLOCKED → re-chequeo)

- F2 (plan): "crear directo" cortado del §2 — la spec nunca lo pide; si un día se quiere, entra vía clarify con acceptance propio. F8 (spec): header y suposición actualizados — constitución vigente + config calibrado, riesgo retirado.
- F1/F3–F7/F9–F12 (tasks): T012 reclama usuarios + filtro; Interfaces en T005/T009/T010/T012/T013; anti-float anclado a T002; formularios + retry en T003; rollback + consistencia en T007; resume en T005; bordes en T006; ausencia de reorden en T010; matriz full en T015; axe nombrado en T014. IDs estables, sin renumerar.

## 2026-09-26 — T005 guards por rol + rutas base (complete)

- `decideAccess` puro en `src/router/guards.ts` (testeado sin router) + `installSessionGuards` fino (el wiring bajo test con memory router, no solo la función — misma lección de T004).
- DenySilent indistinguible: el catch-all redirige a `/not-found` (igual que el guard ante no-admin); el copy de NotFoundView es idéntico en ambos casos. `returnTo` solo se fija hacia login (nunca hacia not-found) y solo nace de `to.fullPath` (sin open-redirect).
- Boot race (cazado por e2e, unit en verde): `app.use(router)` dispara la navegación inicial, así que `restore()` se asienta ANTES de instalar el router en `main.ts`; sin token es inmediato, sin flash.
- `/admin` es placeholder con guard (seam de T010/T012 para `routes/admin.ts`); `openapi.json` de raíz verificado equivalente al snapshot (difiere solo en formato); `e2e/vue.spec.ts` scaffold eliminado (rojo desde T003).
- Expiración API-time en página montada: seam documentado para T009; T005 cubre navegación + boot con `auth:expired` y token caducado real.

## 2026-09-26 — T006 lectura de catálogo (complete)

- Capa `src/api/catalog.ts`: constructores puros de query pineados (precios, flags solo-si-true, sort, skip/limit) + roundtrip URL; el store (`catalog`) solo orquesta lecturas en paralelo y normaliza errores a `{code,message}`.
- Sin aritmética de importes en ningún punto (display-only hasta el template, sin símbolo de moneda por spec clarified); `normalizePriceInput` es codificación de entrada, no cálculo.
- Paginación con heurística de página llena (arrays desnudos sin total); `turnPage` mueve la ventana `skip` sobre los últimos filtros.
- Bordes: marcador sin imagen, vacíos orientadores, sin-resultados con CTA propia (duplicidad de botones cazada por strict-mode en e2e), categoría inválida guiada, reintentos con `role=alert`.

## 2026-09-26 — T007 cesta invitada + fusión (complete)

- Guest-id bajo `eia.guest_cart.v1` (JSON versionado, creado al primer add, jamás en boot); merge vía `POST /cart/merge/{id}` desde las vistas de auth (el store de sesión no conoce la cesta — acoplar en esa dirección rompería dominios).
- Invariante anti-float en mutaciones: tras cada escritura se refetchea la cesta; los totales que pinta la vista son siempre los servidos. El rollback optimista revierte al snapshot ante cualquier fallo posterior.
- Sin cambios al stub T004: el stub sin estado retiene añadir/fusionar/vaciar de forma determinista pero no ediciones; por eso el e2e cubre persistencia (#15), fusión (#4) y vaciado, y la edición con rollback queda en unit con transporte mockeado.

## 2026-09-26 — T008 checkout bloqueante (complete)

- `placeOrder` como cadena de gates que nunca postea condenada: formulario → cesta no vacía → disponibilidad servida → POST. `BLOCKED` es bucket propio de UI (no viaja al servidor); el 409 se traduce a español sin filtrar detalle ajeno.
- El stub ganó estado mínimo (`orderPlaced`: pedir consume la cesta en lecturas/validate/summary), pineado en contract test; las instancias frescas por llamada dejan el resto de la suite intacta.
- `/checkout` con `requiresAuth` (el invitado reanuda vía T005); éxito en-vista con número visible y cesta reseteada; el historial/seguimiento queda a T009.

## 2026-09-26 — T009 cuenta e historial (complete)

- Perfil: `ProfileUpdate` con 7 campos (email/username inmutables desde el frontal); tras PUT se refresca `session.user` para no partir la identidad.
- Pedidos propios: historial + detalle con tracking en paralelo; cancel adopta la respuesta (sin refetch ante stub sin estado) y la propaga al historial; estados en español.
- Sin seguimiento público: no existe ruta ni enlace fuera de la zona autenticada.

## 2026-09-26 — T010 admin de catálogo (complete)

- El stub ganó catálogo mutable por instancia (lecturas derivan, escrituras persisten, validación 422 estilo FastAPI); instancias frescas mantienen verde el resto de la suite.
- Admin reusa lecturas públicas (misma verdad que el cliente) y refetchea tras escribir; aviso de stock bajo solo en zona admin (el cliente solo ve disponible).
- `/admin` es dashboard; retiros directos hasta T013.

## 2026-09-26 — T011 shell IA honesta (complete)

- Sin backend ni stub: la API no expone IA, el hueco es puramente presentacional (launcher permanente + diálogo con copy fijo y caminos manuales a rutas reales).
- Nada de input de chat, nada de respuestas generadas, nada que bloquee: el panel se cierra con Escape, con botón y al navegar.

## 2026-09-27 — T012 admin de pedidos/usuarios + propagación (complete)

- Lista admin sobre summaries (mismo shape que el historial propio); el snapshot pide `Order[]` en `/all` pero el stub sirve summaries — desviación stub-defined pineada en tests, no deriva silenciosa.
- Transiciones de estado/pago solo-query sin body (misma clase C1 de T004-review); el store adopta la respuesta en la lista sin refetch (misma clase que cancel en T009).
- El stub persiste el pedido por instancia (status/payment/cancel) para que la propagación admin→cliente sea observable en lecturas y tracking dentro de un mismo test; instancias frescas arrancan en pending y la suite de contrato sigue verde.
- Filtro de pedidos por estado servido (`?status=`); usuarios listar/ver sin mutación (fuera de alcance v1).

## 2026-09-27 — T013 confirmación en retiros con dependencias (complete)

- "Producto con movimientos" = presente en líneas de pedido servidas (el snapshot no expone endpoint de movimientos; es lectura para el gate, no lógica de negocio nueva — el plan lo pedía así).
- Gate puramente presentacional en las vistas: `countCategoryProducts` puro + `hasMovements` del store; sin dependencias el borrado sigue directo (T010 intacto, pineado por admin-catalog).
- `alertdialog` inline con foco al abrir, Escape/cancelar aborta, confirmar retira y el foco retorna al disparador (misma clase de cuidado que el shell T011).

## 2026-09-27 — T014 puertas AA + perf + cobertura (complete)

- Axe en e2e con reglas completas incl. `color-contrast` (navegador real); el sample jsdom queda como control negativo rápido. Nodos `vue-devtools` excluidos por ser cromo del dev-server (ausentes en preview/prod); el spec audita tras la señal de h1 pintado, nunca el skeleton.
- Cobertura: umbral `lines: 80` pineado en `vitest.config.ts`; las vistas quedan bajas por diseño (sus flujos los cubre e2e).
- Perf medido, no pineado: JS inicial 53.65 KB gzip (chunk único, margen 5x); LCP 272–392 ms en preview (margen 6x). Se recomprueba antes de ship (§15).
- Defectos reales cazados por axe: `heading-order` en ProductCard y `lang` vacío en index.html.

## 2026-09-26 — constitution v1.0.0 (draft, pendiente de ratificar) + `config.yaml`

- Entrevista L2: TDD rojo→verde→refactor + cobertura ≥ 80 % en cambiado · rama+PR siempre (nada directo a `main`) · WCAG 2.2 AA con axe en e2e · Conventional Commits. Las 4 recomendaciones se aceptaron.
- 16 principios en 8 secciones + DoD que `verify` ejecuta; presupuestos con número (JS inicial ≤ 250 KB gzip, LCP ≤ 2.5 s en preview) y pisos comprobables (tipos estrictos, cero warnings, sin secretos, `VITE_API_URL` por entorno).
- `sdd-init`: stack detectado (vue 3.5, vite 8, ts estricto, pinia 4, router 5, pnpm; runners vitest+playwright → `strict_tdd: true`); `execution_mode: interactive` (flujo gated elegido); comandos verify no-mutantes + build; registry refrescado (`npx @ericrisco/rsc registry refresh` OK); skills de stack ya instaladas, nada que añadir; `models.enabled: false` intacto.
