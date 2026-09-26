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
