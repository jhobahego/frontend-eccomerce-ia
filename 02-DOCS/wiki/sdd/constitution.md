---
type: constitution
title: frontend-ecommerce-ia — Constitution
description: The non-negotiable principles every rsc-sdd phase obeys.
tags: [sdd, constitution]
timestamp: 2026-09-26T00:00:00Z
topic: sdd
version: v1.0.0
---

# frontend-ecommerce-ia — Constitution

> Version: v1.0.0 · Ratified: 2026-09-26 · Last amended: 2026-09-26
> The non-negotiable principles every rsc-sdd phase obeys. Stack mechanics live in
> the repo configs (`package.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`,
> `eslint.config.ts`, `.oxlintrc.json`); this file ratifies the principle, not the mechanic.

## 1. Stack canon

1. TypeScript estricto sobre Node `^22.18.0 || >=24.12.0`, Vue 3.5 en Composition API con
   `<script setup lang="ts">`, Vite 8, Pinia 4, vue-router 5. Fijado en `package.json`;
   cambiar de framework o de major es una enmienda MAJOR.
2. pnpm es el único gestor de paquetes; `pnpm-lock.yaml` se commitea y el CI instala con él.
3. Alias `@` apunta a `src`; cada dominio vive en su módulo (`src/stores/<dominio>`,
   vistas y componentes por dominio). El estado compartido vive en Pinia — una store por
   dominio — nunca colgado de componentes ni duplicado entre ellos.

## 2. Quality bar

4. Cada commit sale formateado y sin avisos: prettier aplicado, `oxlint` (categoría
   `correctness` en error) y `eslint` con cero warnings. Comandos: `pnpm lint`, `pnpm format`.
5. `vue-tsc --build` (`pnpm type-check`) pasa sin errores antes de merge — strict más
   `noUncheckedIndexedAccess` heredados de `@vue/tsconfig`.
6. TDD rojo → verde → refactoriza en cada tarea; cobertura de líneas ≥ 80 % en código
   cambiado (vitest, entorno jsdom); los flujos críticos (descubrir → comprar → seguir,
   admin, invitado → login) tienen e2e en Playwright. Sin verde no hay merge.
   Test tooling: `vitest.config.ts`, `playwright.config.ts`.

## 3. Conventions

7. Componentes de un solo cometido con props/emits tipados; la navegación con guards por rol
   vive en el router; las llamadas a la API viven en una capa de cliente tipada, nunca
   desperdigadas en componentes.
8. Todo fallo proveniente de la API se presenta con la forma `{ code, message }` más el
   campo afectado cuando aplique; ningún mensaje técnico ni dato ajeno llega a la pantalla.
9. Commits en Conventional Commits — `type(scope): subject` (`feat`, `fix`, `chore`,
   `docs`, `test`, `refactor`).

## 4. Branching & shipping

10. Todo trabajo va en rama desde `main` (`feat/<slug>`, `fix/<slug>`); merge vía PR.
    Push directo a `main` prohibido, también en cambios de una línea.
11. **Git authorship is the human's.** No `Co-Authored-By` an AI, no "generated with" footer.
    Enforced at the `ship` phase.

## 5. Security & privacy floor

12. Ningún secreto se commitea. La base de la API sale de entorno (`VITE_API_URL`), nunca
    hardcodeada; los `.env*` están gitignored salvo `.env.example` documentado.
13. Los tokens nunca aparecen en código, logs ni URLs; viajan como `Authorization: Bearer`;
    la sesión se renueva con el flujo OAuth2 de la API. Sin vulnerabilidades
    high/critical conocidas en dependencias directas al hacer ship (`pnpm audit`).

## 6. UX / accessibility floor

14. Mínimo WCAG 2.2 AA: todo operable por teclado, foco siempre visible, contraste AA,
    controles con nombre accesible y errores anunciados junto al campo. Auditado con axe
    en los e2e críticos.

## 7. Performance budgets

15. Cada ruta pinta su primer contenido útil con JS inicial ≤ 250 KB gzip (dato del
    `vite build`) y LCP ≤ 2.5 s sobre el servidor de preview local. Se comprueba antes
    de ship; pasarse bloquea el merge salvo enmienda del presupuesto.

## 8. Knowledge & decisions

16. Every significant decision is appended to `02-DOCS/wiki/sdd/decisions.md` (date, options,
    why). The constitution is the highest-order decision record.

## Definition of Done (the merge bar `verify` runs against)

A change ships only when ALL hold:

- [ ] Formatter + linter clean (principle 4).
- [ ] Type checker passes (principle 5).
- [ ] Tests pass; coverage floor met on changed code + critical e2e green (principle 6).
- [ ] Conventions followed (principles 7-9).
- [ ] On a branch, merged via PR, authored by the human (principles 10-11).
- [ ] No secret committed; tokens/passwords safe; audit clean (principles 12-13).
- [ ] Accessibility / performance budgets met (principles 14-15).
- [ ] Significant decisions logged (principle 16).

## Amendment log (append-only)

| Date | Version | Change | Why |
|------|---------|--------|-----|
| 2026-09-26 | v1.0.0 | Ratified initial constitution. | Project kickoff: stack Vue+Vite+Pinia ya fijado, spec clarified exige listones. Explicit user ratification 2026-09-26. |
