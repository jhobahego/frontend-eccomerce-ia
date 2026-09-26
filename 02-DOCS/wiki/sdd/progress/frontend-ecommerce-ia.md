# Apply progress — frontend-ecommerce-ia

Append-only ledger. A task recorded `status: complete` is DONE — never re-dispatch it.

## T001 — 2026-09-26
- status: complete
- red: `pnpm exec vitest run --coverage` → `MISSING DEPENDENCY Cannot find dependency '@vitest/coverage-v8'`; `ls node_modules/@axe-core` → absent
- green: `pnpm exec vitest run --coverage` → 2 files, 3 tests passed, coverage report emitted, 0 errors
- triangulation: `a11y-sample.spec.ts` negative control (img sin alt) → axe reporta `image-alt`; la auditoría no es vacua. `color-contrast` desactivado en jsdom (sin layout real; se audita en e2e con navegador)
- files: package.json, pnpm-lock.yaml, src/__tests__/a11y-sample.spec.ts
- decision: coverage-v8 fijado a `^4.1.11` (el latest 5.0.1 rompe con vitest 4: `Object.takeCoverage`); `axe-core` explícito junto a `@axe-core/playwright` (auditorías rápidas en jsdom vs e2e con navegador)
- blocker: none

## T001-review — 2026-09-26
- status: complete (folded)
- reviewer: fresh-eyes subagent over cb89e52..5309fd3 → 0 Critical, 4 Important, minors deferred to end-of-branch review
- folded now: script `test:coverage` añadido (la puerta queda ejecutable); umbrales ≥80% quedan en T014 (ponerlos hoy rompería el build en verde)
- accepted with owner: muestra axe no audita App real (dueña: T014 e2e); `color-contrast` sin backstop hasta T014 (navegador real); `@axe-core/playwright` sin referenciar hasta T014 (instalación adelantada justificada, no se retira)
- correction: la entrada T001 omite `02-DOCS/wiki/sdd/progress/frontend-ecommerce-ia.md` en `files` — queda constancia aquí, no se reescribe
- pre-existing noted: `playwright.config.ts` usa `npm run` en webServer (tensión con princ. 2 pnpm-only); fix con T004 (infra e2e)

## T002 — 2026-09-26
- status: complete
- red: 4 ficheros sin módulos (import error, wrong reason) → esqueletos que corren mal → 7 assertion reds (enums vacíos, env sin trim/throw, errores sin normalizar, money sin throw)
- green: 15/15 en `src/__tests__/`; `pnpm type-check` limpio; oxlint+eslint limpios (tras endurecer `toThrow` y guards `noUncheckedIndexedAccess` solo en tests)
- triangulation: control negativo axe heredado de T001; contract test pineado a snapshot (enums + required + price-string); float-trap documentado en test
- files: src/api/types.ts, src/api/errors.ts, src/api/money.ts, src/api/env.ts, src/__tests__/api-contract.spec.ts, src/__tests__/money.spec.ts, src/__tests__/errors.spec.ts, src/__tests__/env.spec.ts, src/__tests__/fixtures/openapi.snapshot.json, .env.example
- decision: env lanza error descriptivo sin default (princ. 12, nada hardcodeado); snapshot de 150KB vendoreado a propósito (la deriva se detecta al fallar el test, no en silencio); `Page<T>` es envoltorio de cliente (la API devuelve arrays desnudos); money solo-display que lanza `ApiError` ante malformado
- blocker: none

## T002-review — 2026-09-26
- status: complete (folded)
- reviewer: fresh-eyes subagent over 2d76f20 → 0 Critical, 7 Important, 8 Minor (deferred to branch review except noted)
- folded now: I-1 `.env` gitignored; I-2 ramas reales del backend (credentials/refresh/inactive→UNAUTHORIZED, privileges/not-authorized→FORBIDDEN) con tests; I-3 `NETWORK` no-técnico + convención de unwrap documentada (status-aware queda en T003); I-4 tipos alineados a snapshot (Order.items, OrderItem.total_price, ProductBase, campos computados, depth) + `CartSummary` conserva el nombre del plan con doc de desambiguación; I-5 required exactos + `api-shapes.spec.ts` (pins a compile-time); I-6 último segmento nombrado; I-7 `ApiHttpError extends Error` con `VALIDATION`; M-1 esquema http(s) exigido; M-5 `isAdmin` widened; M-8 tabla de vocabulario en `errors.ts`
- deferred with owner: agregación multi-error → T009 (forms); coverage thresholds → T014; resto de minors → branch review
- second review round skipped deliberately: delta is exactly the demanded folds, proven by 22/22 + type-check (recorded, not hidden)

## T003 — 2026-09-26
- status: complete
- red: imports inexistentes → esqueletos → 9 assertion reds (bearer, normalize, retry, single-flight, expired, login-form, register, restore, logout); e2e rojo (labels sin render: App.vue sin outlet)
- green: 10 unit + 2 e2e (page.route stubs); `pnpm type-check` limpio; oxlint+eslint limpios
- triangulation: N 401 paralelos → 1 refresh; retry una vez y NETWORK; refresh con fallo de red conserva sesión; App.spec reescrito al shell (rojo honesto al cambiar App.vue)
- files: src/api/client.ts, src/stores/session.ts, src/views/LoginView.vue, src/views/RegisterView.vue, src/router/routes/auth.ts, src/router/index.ts, src/main.ts, src/App.vue, src/__tests__/client.spec.ts, src/__tests__/session.spec.ts, src/__tests__/App.spec.ts, e2e/auth.spec.ts (+ playwright.local.config.ts UNTRACKED, channel chrome del sistema; CI intacto)
- decision: fetch nativo sin axios (cero deps); un solo reintento inmediato solo ante TypeError; vuelo único compartido cliente↔store vía runWithFreshToken; auto-login tras registro; label "Correo o usuario" envía campo username; restore() en boot; returnTo en store para T005; route-table auth owned by T003
- blocker: none (bundled chromium no instala en esta distro; e2e local con system chrome vía config untracked)

## T003-review — 2026-09-26
- status: complete (folded)
- reviewer: fresh-eyes subagent over a43b6aa → 1 Critical (C1), 7 Important, minors
- C1 fixed by redesign (no patch): vuelo único con UN solo dueño (store, `Promise<Token>`); cliente ya no envuelve; `clear` atado en creación ⇒ `/me` 401 arranca refresh nuevo, imposible deadlock; `runWithFreshToken` huérfano eliminado (YAGNI); test de concurrencia reescrito al nivel real (1 POST) + test anti-loop
- folded: I1 restore silencioso offline; I2 sin medias sesiones (loadUser limpia); I3 describedby condicional + inválidos en todos los campos; I6 mensaje de expiración; I4 stub verbatim del backend; M1 guard unificado; M-5 ya aplicado en T002
- accepted with owner: I5 `/` muerta hasta T006 (home); I7 heurística CONFLICT→email (backend hoy solo duplica email); M2 nav incompleta hasta shell; M3 `npm run` preexistente → fix con T004
- plan wording fix: done-check T003 decía `vitest run src/stores/session` (0 ficheros) → corregido a los spec reales (edición menor de redacción, sin cambio de alcance)
- second review round skipped (same policy as T002): folds probados 36/32+2e2e + types; el deadlock se prueba por construcción (clear-before-continuation) + test de concurrencia
