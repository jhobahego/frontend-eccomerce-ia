---
type: plan
title: Plan — Frontend Ecommerce IA
description: The structure-level implementation plan for frontend-ecommerce-ia — contracts, shapes, flows.
tags: [sdd, plan]
timestamp: 2026-09-26T00:00:00Z
topic: sdd
slug: frontend-ecommerce-ia
status: draft
---

# Plan — Frontend Ecommerce IA

> Spec: [../specs/frontend-ecommerce-ia.md](../specs/frontend-ecommerce-ia.md) · Constitution: [../constitution.md](../constitution.md) · Status: draft
> Last updated: 2026-09-26

## 0. Global Constraints

- **Stack:** TypeScript strict + `noUncheckedIndexedAccess`; Vue 3.5 Composition API `<script setup lang="ts">`; Vite 8; Pinia 4; vue-router 5; Node `^22.18.0 || >=24.12.0`; pnpm único gestor con `pnpm-lock.yaml` commiteado (constitution §1, principios 1-2).
- **Estructura:** alias `@` → `src`; una store Pinia por dominio; componentes de un solo cometido con props/emits tipados; toda llamada a la API vive en la capa de cliente tipada, nunca en componentes (principios 3, 7).
- **Calidad:** prettier + oxlint (`correctness` = error) + eslint con cero warnings; `vue-tsc --build` limpio; TDD rojo→verde→refactor; cobertura ≥ 80 % líneas en código cambiado; e2e verdes en flujos críticos (principios 4-6).
- **Ramas:** rama `feat/<slug>` desde `main`, merge vía PR, cero push directo; autoría humana sin footers de IA; commits `type(scope): subject` (principios 9-11).
- **Seguridad:** base de la API solo desde `VITE_API_URL`, nunca hardcodeada; tokens nunca en código/logs/URLs, solo `Authorization: Bearer` + refresh OAuth2; `pnpm audit` sin high/critical al ship (principios 12-13).
- **UX:** WCAG 2.2 AA (teclado, foco visible, contraste AA, nombres accesibles, axe en e2e); JS inicial ≤ 250 KB gzip por ruta y LCP ≤ 2.5 s en preview (principios 14-15).
- **Contrato honesto con la IA:** punto de entrada permanente que declara no-disponibilidad con camino manual; nunca inventa respuestas ni bloquea flujos (spec §Behaviour, hueco IA).
- **Invariantes de negocio (spec clarified):** la cesta de invitado persiste en este navegador y se fusiona sin duplicados al login; la validación de disponibilidad bloquea la confirmación; el seguimiento es privado (dueño+admin); el aviso de stock bajo es solo-admin; sin reorden en v1; importes mostrados tal cual entrega la API (cadenas), el frontal nunca recalcula totales autoritativos.

## 1. Context & constraints

- Acceptance que diseña: spec §Acceptance #1-3 (descubrir: portada, filtros, ficha) → lectura de catálogo paginada y filtrable; #4-7 (cesta invitada, fusión, bloqueo por stock, pedido numerado) → núcleo carrito+checkout; #8-10 (sesión persistente, perfil, historial/seguimiento/cancelación) → sesión y pedidos; #11-13 (nega admin, CRUD visible, estados propagados) → guards por rol y admin; #14-16 (IA honesta, vuelta de invitado, confirmación en retiros) → shell y bordes.
- Barras no funcionales: constitution principios 14-15 (AA + presupuestos); principio 6 (puertas de test).
- Reglas en juego: canon §1 (una store por dominio, cliente tipado único), convenciones §3 (forma `{code,message}`), seguridad §5 (Bearer + env), branching §4.
- Out of scope que el diseño NO debe invadir: IA real, pasarela de pago, reorden, social login, wishlist/reseñas, notificaciones, PWA/offline, multi-idioma, backoffice avanzado (spec §Non-goals + diferidas).

## 2. Architecture

```text
[ Views per rol ] --nav+guards--> [ Router + role guards ] --state--> [ Stores: session | catalog | cart | orders | admin | ui ]
        |                                                                                |
        v                                                                                v
[ UI shell + IA slot ]                                                      [ Typed API client ] --Bearer+refresh--> [ Backend API (EXTERNAL) ]
        |                                                                                ^
        v                                                                                |
[ Browser persistence (EXTERNAL) ] <--- session-id + guest cart ---
// [ Backend API ] and [ Browser persistence ] are EXTERNAL; everything else INTERNAL.
```

- **Typed API client** (internal) — única frontera HTTP: inyecta Bearer, renueva sesión con vuelo único, normaliza todo fallo a `{code,message}`.
- **Session store** (internal) — dueña de tokens, usuario actual y rol; login/registro/salida/renovación; expone `isAdmin`.
- **Catalog store** (internal) — lectura: raíces, jerarquía, búsqueda con filtros/orden/paginación, ficha con categoría y similares.
- **Cart store** (internal) — líneas de invitado o propias, fusión al login, resumen servido, puerta de validación bloqueante.
- **Orders store** (internal) — crear desde cesta, historial, seguimiento privado, cancelación cuando el estado lo permite. (Pedido directo sin cesta: cortado del alcance — la spec nunca lo pide; ver decisions 2026-09-26.)
- **Admin area** (internal) — CRUD categorías/productos, ajuste de stock con aviso, estados de pedidos/pagos, usuarios; invisible sin rol.
- **Router + guards** (internal) — negación silenciosa sin rol (sin revelar existencia ni datos).
- **UI shell + IA slot** (internal) — entrada permanente al futuro asistente con fallback honesto.
- **Backend API / Browser persistence** (external) — la API es autoritativa en totales, stock y estados; el navegador solo guarda identificador de sesión invitada y tokens de refresco bajo las reglas de §5.

**Top architectural decision:** un único SPA con áreas por rol frente a dos apps (storefront + backoffice). Se elige el SPA único porque la spec clarified lo fija y porque la fusión invitado→login y la sesión compartida viven en un solo árbol de estado — partirlo duplicaría auth y cesta y rompería los criterios #4-5. La alternativa de backoffice separado se descarta por contradecir la spec, no por coste.
**Segunda decisión:** la renovación de sesión es de vuelo único en el cliente (una sola renovación concurrente con espera en cola) frente a reintentar por store. Se elige vuelo único porque ráfagas de 401 paralelos con doble refresh invalidarían tokens; el coste es una pequeña cola interna, invisible al contrato.

## 3. Interfaces & contracts

```text
api.request(operation, input) -> Ok<model> | ApiError{code, message, field?} | Unauthorized
  - invariant: todo fallo sale normalizado; ningún detalle técnico ni dato ajeno cruza el seam
  - precondition: base URL solo desde entorno; Bearer inyectado cuando hay sesión

auth.login(username, password) -> Session | InvalidCredentials
auth.refresh() -> Session | SessionExpired
  - invariant: vuelo único — N llamadas concurrentes producen UNA renovación; el resto espera
  - postcondition SessionExpired: sesión limpiada, retorno al punto de partida tras login
auth.logout() -> Void  (limpia tokens y estado de sesión)

cart.add(productId, quantity) -> CartSummary | OutOfStock | InvalidQuantity
cart.updateLine / cart.removeLine / cart.clear() -> CartSummary
cart.mergeOnLogin(guestCart, userCart) -> CartSummary
  - invariant: idempotente por producto (suma cantidades, jamás duplica líneas)
cart.validateStock() -> Valid | Blocked(lines[])
  - invariant: Blocked prohíbe crear pedido hasta resolverse (spec clarified)

orders.createFromCart(shipping, billing?, notes?, paymentMethod?) -> Order | BlockedOutOfStock | ValidationError
  - invariant: todo o nada — sin pedidos parciales; el número de pedido siempre visible en éxito
orders.cancel(orderId) -> Order | NotCancellable
orders.track(orderId, session) -> Timeline | Forbidden  (privado: dueño o admin)

catalog.search(filters, paging, sort) -> Page<product>
catalog.tree() -> CategoryHierarchy  (raíces, subniveles, con-productos según vista)
adminGuard(route, session) -> Allow | DenySilent
  - invariant: DenySilent no distingue "no existe" de "sin permiso"
```

## 4. Data model & flow

**Entities**

- **User** — email, username, nombre/apellidos, perfil ampliado; `is_superuser` decide rol (nunca se confía en el cliente para autorizar, solo para ocultar).
- **Category** — name, slug, parent_id (árbol), activación, orden; relación uno-a-muchos consigo misma y con productos.
- **Product** — sku/slug únicos, precio y rebaja como **cadenas decimales (solo display, jamás operando float)**, cantidades enteras, categoría, imágenes, destacado, activación.
- **Cart** — `session_id` (invitado) o `user_id`; líneas {product, qty, unit_price, subtotal}; totales e importes siempre servidos.
- **Order** — número visible, estados (`pending→…→delivered`, `cancelled/refunded`), pago (`pending/paid/failed/refunded`), importes como cadenas, direcciones.
- **Session** — access + refresh; el access vive en memoria de la store, el refresh bajo custodia del navegador.

**Primary flow** (invitado compra, se registra, confirma)

1. Invitado añade productos → cart guarda líneas bajo `session_id` persistido en navegador →
2. se registra/loguea → `mergeOnLogin` fusiona sin duplicados en una sola cesta →
3. confirma → `validateStock` bloquea si algo cayó; si Valid, `createFromCart` →
4. pedido numerado visible; seguimiento privado; admin ve el cambio de estado propagado.

- Consistency boundaries: totales, stock y transiciones de estado son autoritativos del servidor; el cliente solo edita cantidades con rollback ante error. Nada es eventualmente consistente salvo la propagación de estados a vistas abiertas.
- Migration impact: frontal greenfield — ninguna. Lo persistido en navegador lleva clave de versión de esquema y se ignora ante desajuste.

## 5. Testing strategy

| Acceptance criterion | Level | Asserts | Fakes / mocks |
|---|---|---|---|
| spec #1 portada (destacados+raíces) | e2e | pinta destacados y categorías navegables | transporte stub con contratos openapi |
| spec #2 filtros+orden+paginación | unit + e2e | construye filtros exactos; la lista refleja filtros | stub paginado; unit sin red |
| spec #3 ficha (precios, stock, similares) | contract + e2e | formas de producto/categoría/similares válidas vs openapi | stub; formas reales openapi |
| spec #4 fusión al login | unit | suma por producto, cero duplicados, idempotente | stores + relojes falsos, sin red |
| spec #5 editar/vaciar cesta | unit | totales servidos re-renderizados; vacío orientador | stub de resumen |
| spec #6 bloqueo por stock | unit + e2e | `Blocked` prohíbe crear pedido hasta resolver | líneas sin stock en stub |
| spec #7 pedido numerado + cesta lista | e2e | número visible; cesta reiniciada | stub crea-pedido |
| spec #8 sesión persistente | unit | renueva sin credenciales con sesión válida | refresh stub + reloj falso |
| spec #9 editar perfil | contract + e2e | cambios reflejados al recargar | stub usuario |
| spec #10 historial/seguimiento/cancelación | e2e | estados, importes, cancel solo cuando permite | stub máquina de estados |
| spec #11 nega admin silenciosa | e2e negativo | sin rol: ni ve ni accede; sin filtración | sesiones de ambos roles |
| spec #12 CRUD visible + stock-bajo solo admin | e2e | cambios visibles según activación; aviso oculto a cliente | rol admin vs cliente |
| spec #13 estados propagados | e2e | cliente ve el nuevo estado tras cambio admin | dos sesiones en un flujo |
| spec #14 IA honesta no bloqueante | e2e | mensaje de no-disponibilidad + camino manual; compra intacta | sin backend IA (no existe) |
| spec #15 invitado que vuelve | unit + e2e | cesta conservada en mismo navegador | persistencia stub |
| spec #16 confirmación en retiros | e2e | exige confirmación con dependencias | categoría con productos en stub |

- La línea e2e cubre flujos felices + negaciones + shell IA; las permutaciones CRUD finas quedan en unit/contract.
- Debe ser real (no mockeado): las formas openapi en contract tests; la concurrencia del refresh de vuelo único con reloj falso; la prohibición de recalcular totales (test que falla si el cliente suma precios).
- E2E corre contra **transporte stub que implementa los contratos openapi** (determinista, sin backend vivo); un smoke contra backend real es opcional cuando haya URL. Los stubs se verifican con contract tests para que no deriven.

## 6. Sequencing & dependencies

1. Cimiento: cliente tipado + envoltorio `{code,message}` + config por entorno — depende de: nada — [serial, primero]
2. Sesión + guards por rol — depende de: #1 — [serial]
3. Lectura de catálogo (portada, árbol, búsqueda, ficha) — depende de: #1 — [parallelizable con #2]
4. Cesta invitada + fusión + validación bloqueante — depende de: #1, #2 — [serial]
5. Checkout → pedido numerado — depende de: #4 — [serial]
6. Cuenta + historial/seguimiento/cancelación — depende de: #2, #5 — [parallelizable con #7]
7. Admin (categorías, productos+stock, pedidos, usuarios) — depende de: #2, #3, #5 — [parallelizable con #6]
8. Shell IA honesta — depende de: #1 — [parallelizable en cualquier momento tras #1]
9. Puertas finales: axe AA, presupuestos perf, e2e completos, cobertura — depende de: todo — [serial, último]

- Parallel candidates: #2 &#3; #6 &#7; #8 tras #1 (fan-out vía fase parallel).
- Orden duro: #1 antes que todo (el seam de test); #4 antes que #5 (sin cesta no hay checkout); #9 cierra (las puertas miden el todo).

## 7. Risks & open decisions

**Risks** (ranked)

| Risk | Trigger | Impact | Mitigation / spike to retire it |
|---|---|---|---|
| Deriva de contrato con la API | el backend cambia formas sin avisar | stubs y cliente mienten en verde | snapshot de `openapi.json` + contract tests que fallan ante deriva |
| Carreras en refresh | ráfaga de 401 paralelos | doble refresh invalida sesión | vuelo único + test de concurrencia con reloj falso |
| Aritmética con importes-cadena | alguien parsea a float para sumar | céntimos perdidos en resúmenes | invariante §0 + test que prohíbe sumar precios en cliente |
| Vida del `session_id` invitado | expira o colisiona | cesta perdida o ajena | persistencia versionada + fusión idempotente; e2e #15 |
| Flaky e2e multi-navegador | 3 navegadores × red simulada | señal ruidosa, merge lento | matriz mínima en PR (chromium) + completa en ship; traces ya configurados |
| Filtración en admin | error que distingue 403/404 | un sin-rol enumera datos | `DenySilent` + e2e negativo #11 |
| IA que promete de más | shell ambiciosa | rompe el contrato honesto | copy fijado en spec; test #14 lo blinda |

**Open decisions**

- Valor de `VITE_API_URL` por entorno (dev/staging/prod) — cierra cuando se aporte la URL del backend; mientras tanto `.env.example` documentado.
- Stub vs backend vivo en e2e — recomendado stub (decidido aquí, a validar en `tasks` si alguien pide live).

## Tasks
<!-- generated by tasks on 2026-09-26; IDs are stable, do not renumber -->

| ID | [P] | Task | Done-check | Depends-on | Trace |
| --- | --- | --- | --- | --- | --- |
| T001 |  | Equipar puertas de test (coverage + axe) | `pnpm exec vitest run --coverage` emite reporte; auditoría axe de muestra en verde | — | constitution §2/§6 (princ. 6, 14) |
| T002 |  | Fijar tipos del dominio + envoltorio error + env | `pnpm type-check` verde; contract test de formas producto vs snapshot openapi en verde (red→green); test anti-float (sumar precios en cliente falla) verde; `.env.example` con `VITE_API_URL` existe | T001 | plan §4 + spec Anexo B |
| T003 | [P] | Implementar cliente tipado + sesión con refresh de vuelo único | session spec red→green, incl. test de concurrencia (N 401 paralelos → UNA renovación) + unit reintento ante fallo de red; e2e formularios registro (duplicado) y login (error junto al campo) verdes; `pnpm exec vitest run src/stores/session` verde | T002 | spec #8 + plan §3 |
| T004 | [P] | Levantar stub transporte + contract tests vs snapshot | contract suite verde; mutar el stub a propósito la pone en rojo (el stub no puede mentir) | T002 | plan §5 + spec Anexo B |
| T005 | [P] | Cablear guards por rol + rutas base | unit guards verde + e2e negativo #11 verde + e2e resume tras expiración (redirige, login, retoma donde estaba) verde (`pnpm exec playwright test e2e/guards --project=chromium`) | T003 | spec #11 |
| T006 | [P] | Construir lectura de catálogo (portada, árbol, búsqueda, ficha) | unit de filtros verde + e2e #1-3 verdes, incl. bordes (placeholder sin imagen, vacíos orientadores, sin-resultados con quitar-filtros) | T002, T004 | spec #1-3 |
| T007 | [P] | Construir cesta invitada + persistencia + fusión | unit merge idempotente (suma, cero duplicados) + unit rollback de cantidades ante error + consistencia de importes cesta/resumen/pedido + e2e #4 y #15 verdes | T003, T004 | spec #4-5, #15 |
| T008 |  | Cerrar checkout bloqueante → pedido numerado | unit `Blocked` prohíbe crear pedido + e2e #6-7 verdes | T007 | spec #6-7 |
| T009 |  | Entregar cuenta + historial/seguimiento/cancelación | e2e #9-10 verdes (contract de perfil incluido) | T003, T008 | spec #9-10 |
| T010 | [P] | Entregar admin de catálogo + stock con aviso | e2e CRUD + aviso de stock visible solo con rol admin + assert de ausencia de reorden verdes | T003, T006 | spec #12 (parte) |
| T011 | [P] | Montar shell IA honesta | e2e #14 verde (no-disponibilidad + camino manual; compra intacta) | T002 | spec #14 |
| T012 | [P] | Entregar admin de pedidos/usuarios + propagación | e2e resto #12 + #13 verdes (cliente ve el nuevo estado) + e2e listar/ver usuarios y filtro de pedidos por estado verdes | T008, T010 | spec #12-13 + §Behaviour admin |
| T013 |  | Exigir confirmación en retiros con dependencias | e2e #16 verde | T010 | spec #16 |
| T014 |  | Pasar puertas AA + perf + cobertura | axe verde en e2e de catálogo, checkout, login, cuenta y admin; JS inicial ≤ 250 KB gzip por ruta; LCP ≤ 2.5 s en preview; cobertura ≥ 80 % en cambiado | T009, T011, T012, T013 | constitution §6-7 |
| T015 |  | Cerrar verify completo del build | cada fila de arriba comprobada + `pnpm type-check`, lint, `vitest run --coverage`, e2e chromium y `pnpm build` verdes; matriz completa chromium+firefox+webkit en ship | T014 | spec §Acceptance |

**Convención de aislamiento (por qué los `[P]` son seguros):** cada dominio registra sus rutas en `routes/<dominio>.ts` (ficheros nuevos) agregados por `router/index.ts`; cada tarea toca solo su route-table + su store + sus vistas. `router/index.ts` y `App.vue` (solo T011) no son compartidos. Sin esta convención, `router.ts` sería la colisión y ningún `[P]` valdría.
**Orden y fan-out (L2):** T001→T002 abren (seam + formas); tras T002, T003 y T004 corren en paralelo (cliente vs stubs, cero ficheros comunes); tras T003+T004, T005/T006/T007 en paralelo (guards, catálogo, cesta); T008 encadena cesta→pedido (serial: sin cesta no hay checkout); T009 sigue a T008; T010/T011/T012 en paralelo cuando caen sus deps (admin-catálogo, shell IA, admin-pedidos son disjuntos); T013 cierra admin; T014 mide el todo; T015 lo certifica. Riesgo: T003 (concurrencia) y T004 (verdad de los stubs) sostienen todo — si caen, nada encima vale.

**T002 — Interfaces**
- Produces: envoltorio `ApiError{code, message, field?}`; formas de dominio (User, Category, Product con precios-cadena, Cart, Order); `VITE_API_URL` solo desde entorno.

**T003 — Interfaces**
- Consumes: `ApiError` + formas (T002); login OAuth2 password-flow (`username+password` form-urlencoded → `{access_token, refresh_token}`).
- Produces: store sesión `{accessToken en memoria, user, isAdmin}`; `refresh()` de vuelo único; `SessionExpired` limpia y marca retorno.

**T004 — Interfaces**
- Consumes: snapshot `openapi.json` (raíz del repo).
- Produces: stub con todos los contratos del plan §3 + suite que falla ante cualquier deriva.

**T006 — Interfaces**
- Produces: formas de lectura `Page<product>`, `CategoryHierarchy` que T010 reutiliza en admin.

**T007 — Interfaces**
- Consumes: sesión (T003), endpoints de cesta del stub (T004).
- Produces: `CartSummary` servido + `mergeOnLogin` idempotente + `validateStock() -> Valid | Blocked`.

**T008 — Interfaces**
- Consumes: `CartSummary` (T007).
- Produces: `Order` numerado + invariante todo-o-nada + `BlockedOutOfStock`.

**T005 — Interfaces**
- Consumes: store sesión `{isAdmin}` + `SessionExpired` (T003); route-tables propias `routes/auth.ts`, `routes/base.ts`.
- Produces: `adminGuard(route, session) -> Allow | DenySilent`; resume tras expiración (redirige, login, retoma).

**T009 — Interfaces**
- Consumes: sesión (T003); `Order` + `Timeline` + `NotCancellable` (T008); `ApiError` (T002).
- Produces: vistas de cuenta; reutiliza seguimiento privado sin redefinirlo.

**T010 — Interfaces**
- Consumes: formas `Page<product>`, `CategoryHierarchy` (T006); `isAdmin` (T003); `ApiError` (T002).
- Produces: vistas admin de catálogo; aviso de stock solo-admin; sin acción de reorden.

**T012 — Interfaces**
- Consumes: `Order` + estados (T008); vistas/lecturas admin de catálogo (T010); sesión admin (T003).
- Produces: vistas admin de pedidos (listar + filtro por estado) y usuarios (listar/ver); propagación de estados a seguimiento.

**T013 — Interfaces**
- Consumes: ganchos de retiro de T010 (categoría con productos, producto con movimientos).
- Produce: diálogo de confirmación explícita; sin lógica de negocio nueva.

**Decisión cerrada aquí:** stub-vs-live queda en **stub verificado por contract tests** (plan §5); un smoke contra backend vivo es opcional y nunca puerta.

## Review Workload Forecast

| Dimension | Forecast | Why |
|---|---|---|
| Estimated changed lines | ~4.000-6.000 (impl + tests) | 15 tareas con TDD y e2e en 6 dominios + puertas |
| Files / areas | ~45-60 (stores, vistas, routes/*, client, stubs, e2e, docs) | un store + vistas por dominio, route-tables separadas |
| Review risk | medium-high | concurrencia de refresh, deriva de contrato, presupuesto AA/perf |
| Suggested delivery | ask-on-risk | supera el line_budget 400 de config; PRs por hito (M0 cimiento, M1 catálogo+cesta, M2 pedidos+cuenta, M3 admin, M4 puertas) sobre `feat/frontend-ecommerce-ia` |
