---
type: analysis
title: Analysis — Frontend Ecommerce IA
description: Pre-implementation consistency gate over constitution, spec, plan and tasks for frontend-ecommerce-ia.
tags: [sdd, analysis]
timestamp: 2026-09-26T00:00:00Z
topic: sdd
slug: frontend-ecommerce-ia
---

# Analysis — Frontend Ecommerce IA

> Spec: [../specs/frontend-ecommerce-ia.md](../specs/frontend-ecommerce-ia.md) · Plan: [../plans/frontend-ecommerce-ia.md](../plans/frontend-ecommerce-ia.md) · Constitution: [../constitution.md](../constitution.md) · Config: [../config.yaml](../config.yaml)
> Date: 2026-09-26 · Dial: L2 (per finding: recommended phase + cost of leaving it)

## GATE: PASS — re-chequeo 2026-09-26 (era BLOCKED: 1 HIGH · 6 MEDIUM · 5 LOW, todo resuelto abajo)

> Re-run ligero: F1 usuarios/filtro → T012 reclama e2e; F2 "directo" cortado del plan §2 + logged; F3 Interfaces en T005/T009/T010/T012/T013; F4 anti-float en T002; F5 formularios en T003; F6 retry en T003 + rollback en T007; F7 resume en T005; F8 header spec vigente; F9 bordes en T006/T007; F10 ausencia en T010; F11 matriz en T015; F12 axe nombrado en T014. IDs de tarea estables. El mapa de cobertura queda: R21/R22 covered, R24 eliminado por corte, R17–R20/R23 covered.

## Coverage map

```text
REQ-ID | Spec requirement (short)                  | Plan section | Task(s) | Status
------ | ----------------------------------------- | ------------ | ------- | ----------
R01    | #1 portada (destacados + raíces)          | §5           | T006    | covered
R02    | #2 filtros + orden + paginación           | §3, §5       | T006    | covered
R03    | #3 ficha (precios, stock, similares)      | §3, §4, §5   | T006    | covered
R04    | #4 fusión al login                        | §3, §4       | T007    | covered
R05    | #5 editar / vaciar cesta                  | §3           | T007    | covered
R06    | #6 bloqueo por stock                      | §3           | T008    | covered
R07    | #7 pedido numerado + cesta lista          | §3, §4       | T008    | covered
R08    | #8 sesión persistente + refresh           | §3           | T003    | covered
R09    | #9 ver / editar perfil                    | §3           | T009    | covered
R10    | #10 historial + track privado + cancelar  | §3           | T009    | covered
R11    | #11 nega admin silenciosa                 | §2, §3       | T005    | covered
R12    | #12 CRUD + aviso stock + sin reorden      | §2, §5       | T010    | covered (ausencia sin assert → F10)
R13    | #13 estados propagados a cliente          | §2           | T012    | covered
R14    | #14 IA honesta no bloqueante              | §2, §5       | T011    | covered
R15    | #15 invitado que vuelve                   | §4           | T007    | covered
R16    | #16 confirmación en retiros               | §3           | T013    | covered
R17    | Bordes: placeholder, vacíos, sin-result.  | §5 (implíc.) | T006    | AMBIGUOUS → F9
R18    | Registro/duplicados + errores junto campo | §3 (contr.)  | T003    | AMBIGUOUS → F5
R19    | Retry de red + rollback cantidades        | §3, §4       | —       | AMBIGUOUS → F6
R20    | Resume tras sesión expirada               | §3 (postc.)  | —       | AMBIGUOUS → F7
R21    | Admin: listar / ver usuarios              | §2 (mención) | —       | GAP → F1
R22    | Admin: listar pedidos + filtro estado     | §2 (mención) | —       | GAP → F1
R23    | Prohibición aritmética float en cliente   | §5 (real)    | —       | AMBIGUOUS → F4
R24    | "Crear directo" (mención plan §2/§4)      | §2, §4       | —       | AMBIGUOUS → F2
```

Excluido por diseño y consistente en los tres artefactos (sin fila): reorden, stats, IA real, pasarela, login social, wishlist/reseñas, notificaciones, PWA/offline, multi-idioma, backoffice avanzado.

## Findings

| # | Severity | Type | Artifact A (loc) | Artifact B (loc) | Conflict | Resolve in |
|---|---|---|---|---|---|---|
| F1 | HIGH | GAP | spec §Behaviour admin ("listar todos los pedidos con filtro por estado… y listar y ver usuarios") | plan §3 (sin contrato de usuarios ni de listado/filtro) + tasks T012 (done-check solo resto #12 + #13) | Dos capacidades prometidas sin acceptance y sin assert: si nadie las reclama, el admin sale sin usuarios ni filtro y nadie lo nota hasta el ship | tasks (extender T012 con e2e de usuarios y filtro; opcional: 2 líneas de acceptance vía clarify) — dejarlo: admin incompleto descubierto en verify |
| F2 | MEDIUM | Contradiction / AMBIGUOUS | plan §2 + §4 ("crear desde cesta/directo") | plan §3 (solo `createFromCart`) + spec (silencio total sobre pedido directo) | "Directo" existe en dos párrafos y en ningún contrato: o es alcance real sin diseñar o es una palabra de más que un implementador puede tomarse en serio | plan (cortar "directo" o contratarlo + tarea) — dejarlo: implement inventa el contrato |
| F3 | MEDIUM | Carrier | tasks T005, T009, T010, T012 (T013 menor) sin bloque Interfaces | plan §3 (contratos que no poseen: sesión/isAdmin, formas catálogo, CartSummary, Order) | El implementador aislado solo ve su tarea: sin `Consumes` exactos, adivina firmas del vecino | tasks (4 bloques Interfaces; T013 basta una línea) — dejarlo: firmas divergentes entre stores |
| F4 | MEDIUM | AMBIGUOUS | plan §5 ("test que falla si el cliente suma precios" debe ser real) | tasks (ninguna done-check lo reclama) | La invariante anti-float más rentable del plan no tiene dueña | tasks (anclar a T002) — dejarlo: la invariante existe solo en prosa |
| F5 | MEDIUM | AMBIGUOUS | spec §Behaviour + error paths (registro con duplicados, errores junto al campo; princ. 14) | tasks T003 (done-check solo login/refresh) | El camino feliz del registro se ejerce vía #4/T007, pero validación, duplicados y anuncio de errores no tienen assert | tasks (extender T003 con e2e de formularios) — dejarlo: formularios que fallan en silencio |
| F6 | MEDIUM | AMBIGUOUS | spec error paths (reintento de red, conservar cesta) + plan §4 (rollback) | tasks T002/T007 (sin assert de red/rollback) | El plan promete rollback y la spec reintento; ningún done-check los ejecuta | tasks (unit red+rollback en T002/T007) — dejarlo: caídas que pierden la cesta |
| F7 | MEDIUM | AMBIGUOUS | plan §3 (`SessionExpired`: limpia y retoma tras login) | tasks T003/T005 (sin assert de resume) | Postcondición diseñada pero no reclamada: el flujo "caducó → login → retoma donde estaba" puede no existir | tasks (e2e de resume en T003/T005) — dejarlo: sesiones que caducan a pantalla fría |
| F8 | LOW | Contradiction (stale) | spec header ("aún no existe constitution.md ni config.yaml; sin restricciones") | 02-DOCS (ambos existen, constitución vigente) | Un lector solo-spec ignora guardrails que ya están en vigor; el plan §0 lo compensa, por eso es LOW | clarify (retoque de una línea) |
| F9 | LOW | AMBIGUOUS | spec edge (placeholder, vacíos, sin-resultados, consistencia de importes) | tasks T006/T007 (done-checks no los nombran) | Bordes prometidos que el e2e puede no mirar | tasks (nombrarlos en T006/T007) |
| F10 | LOW | AMBIGUOUS | spec #12 ("no existe acción de reorden") | tasks T010 (sin assert de ausencia) | La ausencia decidida no se comprueba: una futura mano puede añadir el botón sin romper nada | tasks (assert de ausencia en T010) |
| F11 | LOW | AMBIGUOUS | plan riesgo (matriz completa en ship) | tasks T015 (done-check dice chromium) | La matriz multi-navegador no tiene dueña explícita | tasks (anotar matriz full en T015) |
| F12 | LOW | AMBIGUOUS | tasks T001/T014 (axe "en e2e críticos", sin ficheros) | — | "Críticos" sin lista es interpretable | tasks (nombrar los ficheros en T014) |

Constitution compliance: sin violaciones — §0 del plan refleja los 16 principios; T001 cita principios (no es drift, es trabajo mandado por la constitución); ramas, comandos y puertas usan los valores calibrados.

## Recommended routing

- **tasks** (una pasada de retoques, sin código): F1, F3–F7, F9–F12. Todo es extender done-checks y añadir 4 Interfaces — barato ahora, rewrite si se descubre en implement.
- **plan** (una línea): F2 — cortar "directo" o contratarlo.
- **clarify** (una línea): F8 — actualizar el header stale de la spec.
- Tras los retoques, re-chequeo ligero solo de las filas afectadas (no un analyze completo) y puerta abierta a `implement`.
