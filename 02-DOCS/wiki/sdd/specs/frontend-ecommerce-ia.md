---
type: spec
title: Spec — Frontend Ecommerce IA (storefront + admin mínimo, IA preparada)
description: WHAT and WHY for frontend-ecommerce-ia — problema, metas, comportamiento y aceptación del ecommerce que consume la API.
tags: [sdd, spec]
timestamp: 2026-09-26T00:00:00Z
topic: sdd
slug: frontend-ecommerce-ia
status: clarified
---

# Spec — Frontend Ecommerce IA

> Slug: `frontend-ecommerce-ia` · Status: clarified · Created: 2026-09-26 · Clarified: 2026-09-26
> Inherits: [constitution](../constitution.md) v1.0.0 (ratificada 2026-09-26) + `02-DOCS/wiki/sdd/config.yaml` calibrado. El aviso previo sobre su ausencia queda retirado (ver punto resuelto abajo).
> Fuente de verdad de capacidades: `openapi.json` del backend (raíz del repo, `Ecommerce API v1.0.0`).
> Decisiones de frontera tomadas el 2026-09-26: IA solo preparada en v1 · un único frontal con cliente + admin mínimo · carrito invitado con fusión al iniciar sesión · flujo con paradas por fase (sin autopilot).

## Problem & why

Hoy no existe ningún frontal: la tienda solo es operable mediante la documentación interactiva de la API. Un comprador no puede descubrir productos, comprar sin ayuda técnica ni seguir sus pedidos, y un administrador no puede gestionar catálogo ni pedidos desde una interfaz. Sin frontal, la API completa (autenticación, categorías, productos, carrito, pedidos) no genera valor comercial. La spec cierra esa brecha con un frontal único que cubre descubrir → comprar → seguir el pedido → gestionar lo básico, dejando el hueco del asistente IA 24/7 visible pero sin prometerlo en v1 (la API no expone ninguna capacidad de IA).

## Cost of not building it

Sin frontal, la tienda no vende: cada compra requeriría conocimiento técnico para invocar la API a mano, por lo que el canal online queda en cero pedidos y el catálogo/administración solo avanzan por herramientas de desarrollo. El coste es total para el objetivo del proyecto (el perfil declara crear el frontal del ecommerce): no hay degradación parcial, hay ausencia del producto.

## The cheapest alternative

Servir solo la documentación interactiva existente más unas páginas estáticas de catálogo generadas a mano. Cubriría "ver qué se vende" con coste mínimo y cero mantenimiento de sesión, carrito o roles. No basta porque no permite comprar, ni recordar cestas de invitados, ni autenticar usuarios, ni administrar — es decir, resuelve la vitrina y ninguno de los flujos que justifican el frontal.

## Goals

- Un visitante puede descubrir lo que se vende: ver destacados, navegar por categorías y jerarquía, buscar por texto y filtrar por categoría, precio, disponibilidad y destacados, y abrir la ficha de un producto con su categoría y productos similares.
- Un visitante puede comprar con o sin cuenta: llevar cesta como invitado, iniciar sesión o registrarse conservando lo que ya llevaba, ajustar cantidades, ver el resumen con importes, validar disponibilidad antes de pagar y convertir la cesta en un pedido con datos de envío.
- Un cliente puede gestionar lo suyo: mantener su sesión sin reintroducir credenciales en cada visita, ver y editar su perfil, ver sus pedidos, seguir su estado y cancelar cuando aún sea posible.
- Un administrador puede operar lo básico en el mismo frontal con accesos protegidos por rol: gestionar categorías (incluida jerarquía; el reorden queda diferido fuera de v1), gestionar productos (incluido stock, aviso de stock bajo solo visible para admin, y destacados), ver todos los pedidos y cambiar su estado y estado de pago, y ver usuarios.
- El hueco del futuro asistente IA 24/7 queda reservado de forma visible (punto de entrada permanente en la interfaz) pero sin comportamiento inteligente en v1: no promete respuestas, no inventa datos, no bloquea ningún flujo si no está disponible.

## Non-goals / out of scope

- Asistente IA real en v1: sin respuestas generadas, sin chat funcional contra ningún motor, sin historial inteligente. Solo presencia reservada.
- Pagos reales: el pedido recoge el método de pago como dato informativo; no hay pasarela, cobro, ni reembolso económico en el frontal.
- Backoffice avanzado: sin importación masiva, sin cupones/descuentos complejos, sin gestión de impuestos/envíos por reglas, sin auditoría, sin panel de estadísticas más allá de lo que el cliente y el admin básico necesitan para operar.
- Cuentas sociales, recuperación de contraseña por correo, verificación de correo, wishlist, valoraciones y reseñas, notificaciones push/correo.
- Aplicación móvil nativa, modo sin conexión, multitienda, multi-idioma completo (v1 en un solo idioma), temas múltiples.
- Reorden manual de categorías: diferido fuera de v1 por decisión explícita (el admin cubre crear, editar y retirar).

## Users & context

- **Visitante sin cuenta** que llega a comprar: quiere ver qué hay, comparar y llevarse la cesta sin fricción de registro previo. Su contexto es primera visita, desconfianza al registro, y abandono si se le exige cuenta antes de tiempo.
- **Cliente registrado** que repite: quiere entrar y seguir donde lo dejó (cesta conservada tras el login), comprar en pocos pasos, y después saber dónde está su pedido y qué ha comprado antes.
- **Administrador de tienda** que opera el negocio: necesita mantener el catálogo (categorías y productos, precios, stock, destacados), atender pedidos (cambiar estado, marcar pago, cancelar) y ver usuarios. Trabaja en el mismo frontal pero solo ve lo administrativo si su rol lo permite; un no-administrador nunca descubre esas pantallas ni datos ajenos.
- Todos actúan sobre el mismo catálogo y los mismos pedidos que ya existen en la API; el frontal no crea reglas de negocio nuevas, las hace visibles y operables.

## Behaviour

- Main path — descubrir: al abrir la tienda se ven destacados y categorías raíz; al elegir una categoría se ven sus productos y subcategorías; al buscar se pueden combinar texto, categoría, rango de precios, solo destacados y solo disponibles, con orden (novedad, precio) y paginación; la ficha de producto muestra descripción, precio y precio rebajado cuando existe, disponibilidad, imágenes, categoría y similares.
- Main path — comprar como invitado y como cliente: añadir desde listado o ficha ajustando cantidad; la cesta muestra líneas con precio unitario y subtotal, total de artículos e importe, y permite cambiar cantidades, quitar líneas y vaciarla; la cesta de invitado se conserva en este navegador entre visitas y, al registrarse o iniciar sesión, se fusiona con la propia; antes de confirmar se comprueba la disponibilidad y, si algo quedó sin stock, la confirmación queda bloqueada con aviso hasta resolverlo; la confirmación pide datos de envío (y opcionalmente facturación, teléfono, notas y método de pago) y produce un pedido con número visible.
- Main path — cuenta y pedidos: el registro pide correo, nombre de usuario, nombre y apellidos más contraseña; el login mantiene la sesión entre visitas y la renueva sin pedir credenciales de nuevo mientras siga válida; el cliente ve y edita su perfil; ve su historial de pedidos con importes y estados, el detalle de cada uno, su seguimiento privado (solo dueño y admin, sin consulta pública) y la opción de cancelar mientras el estado lo permita.
- Main path — admin mínimo: las zonas administrativas solo son visibles y alcanzables con rol administrador; permiten crear, editar y retirar categorías (con padre, descripción, imagen, orden y activación) y productos (con referencia, precios, stock, categoría, imágenes, destacado y activación), ajustar stock con aviso de stock bajo visible solo para el admin (el cliente solo ve disponible/no disponible), listar todos los pedidos con filtro por estado, cambiar estado y estado de pago, y listar y ver usuarios; retirar una categoría con productos o un producto con movimientos exige confirmación explícita.
- Hueco IA (preparada, no funcional): existe un punto de entrada permanente y recognizable al futuro asistente en toda la tienda; al abrirse explica con honestidad que el asistente aún no está disponible y ofrece el camino manual equivalente (buscar, ver ayuda, contactar); nunca inventa respuestas ni bloquea comprar o navegar.
- Edge cases: catálogo vacío o categoría sin productos muestra vacío orientador, no pantalla en blanco; búsqueda sin resultados propone quitar filtros; producto sin imágenes muestra marcador, no roto; cesta vacía explica cómo empezar; invitado que inicia sesión con cesta en ambos lados termina con una sola cesta fusionada sin duplicar líneas del mismo producto; invitado que vuelve en el mismo navegador encuentra su cesta conservada; importes con decimales se muestran consistentes en cesta, resumen y pedido.
- Error paths: credenciales inválidas, correo/usuario ya registrado, datos de formulario inválidos y falta de permisos se comunican junto al campo o acción que los provoca, sin revelar datos ajenos; fallos de red o del servicio muestran reintento y conservan lo escrito y la cesta; un pedido que ya no se puede cancelar lo indica y no ofrece la acción; una sesión caducada redirige a identificarse y retoma donde estaba tras el login.

## Acceptance criteria

- Given un visitante en la portada, When la abre, Then ve productos destacados y categorías navegables.
- Given un visitante en el catálogo, When filtra por categoría, rango de precio, disponibilidad o destacados y ordena, Then la lista refleja exactamente esos filtros y permite paginar.
- Given un visitante en la ficha de un producto, When la abre, Then ve precio (y rebajado si existe), disponibilidad, categoría y productos similares.
- Given un visitante con cesta de invitado, When se registra o inicia sesión, Then conserva lo que llevaba fusionado en una sola cesta sin líneas duplicadas.
- Given un invitado con cesta que cierra y vuelve en el mismo navegador sin cuenta, When reabre la tienda, Then encuentra su cesta conservada.
- Given un comprador con cesta, When cambia cantidades, quita líneas o la vacía, Then el total de artículos e importe se actualizan y la cesta vacía muestra cómo empezar.
- Given un comprador listo para confirmar, When algún artículo quedó sin disponibilidad, Then la confirmación queda bloqueada con aviso hasta resolverlo y no se genera un pedido incorrecto.
- Given un comprador con datos de envío completos, When confirma, Then se crea un pedido con número visible y la cesta queda lista para la siguiente compra.
- Given un cliente autenticado, When vuelve en una visita posterior con sesión válida, Then sigue identificado sin reintroducir credenciales.
- Given un cliente en su cuenta, When edita su perfil, Then los cambios se reflejan al recargar su perfil.
- Given un cliente con pedidos, When abre su historial y un pedido, Then ve estados, importes, detalle y seguimiento, solo puede cancelar cuando el estado lo permite, y nadie sin sesión puede ver seguimientos ajenos.
- Given un usuario sin rol administrador, When intenta alcanzar una zona administrativa, Then no la ve ni accede a datos ajenos.
- Given un administrador, When gestiona categorías y productos (crear, editar, retirar, ajustar stock, marcar destacado), Then los cambios son visibles en el catálogo según activación y disponibilidad, ve el aviso de stock bajo donde el cliente solo ve disponible/no disponible, y no existe acción de reorden en v1.
- Given un administrador que retira una categoría con productos o un producto con movimientos, When lo intenta, Then se le exige confirmación explícita.
- Given un administrador en pedidos, When cambia el estado o el estado de pago, Then el cliente ve ese nuevo estado en su seguimiento.
- Given cualquier visitante, When abre el punto del futuro asistente, Then recibe un mensaje honesto de no disponibilidad con el camino manual equivalente y ningún flujo queda bloqueado.

## Points to clarify

> Resultado de `clarify` 2026-09-26: las 4 preguntas abiertas se preguntaron y resolvieron (ver `## Clarifications`); los 4 supuestos se validaron y se mantienen; lo diferido se deja intacto; ninguna área graduó.

- **suposición tomada** (validada 2026-09-26, se mantiene) — v1 en un solo idioma (español) y diseño visual libre sin sistema de marca previo. *Base:* no hay guía de diseño en el repo ni requisito de idioma en la API. *Riesgo:* si se exige otro idioma o marca concreta, cambian criterios de presentación pero no los flujos.
- **suposición tomada** (validada 2026-09-26, se mantiene) — los importes se muestran tal cual los entrega la API (cadenas con decimales); el frontal no define moneda ni impuestos propios. *Base:* los esquemas de producto/cesta/pedido usan cadenas para precios e importes. *Riesgo:* si se exige formato de moneda o cálculo local, cambian los criterios de resumen.
- **suposición tomada** (validada 2026-09-26, se mantiene) — el método de pago del pedido es solo informativo, sin pasarela. *Base:* la API lo modela como texto libre. *Riesgo:* si entra una pasarela real, el flujo de confirmación y sus criterios se reescriben.
- **suposición tomada** (resuelta 2026-09-26, riesgo retirado) — la spec avanzaba sin `constitution.md` ni `config.yaml`; ambos existen ahora (constitución v1.0.0 ratificada, config calibrado con `strict_tdd: true`). *Base:* ficheros creados y ratificados el 2026-09-26.
- **decisión diferida** — pasarela de pago real, recuperación/verificación por correo, login social, wishlist, reseñas, cupones, notificaciones, PWA/sin conexión, multi-idioma. Fuera de este ciclo por decisión explícita de alcance.
- **decisión diferida** — panel estadístico completo y gestión avanzada de impuestos/envíos. Fuera de v1.
- **decisión diferida** — reorden manual de categorías. Fuera de v1 por decisión explícita del 2026-09-26.
- **área no formulable** — el contrato real del asistente IA (capacidades, límites, fuentes de datos, tono, privacidad). Se sabe que llegará y aún no se puede enunciar con precisión; graduará a pregunta abierta cuando exista contraparte en el backend.
- **área no formulable** — estrategia de contenidos/SEO más allá del mínimo presentable. Se intuye la necesidad y aún no hay requisitos enunciables.

## Clarifications

> Log de `clarify` — 2026-09-26. Cada entrada: pregunta → decisión → por qué.

- Q: ¿quién ve el aviso de stock bajo? → Decisión: solo el admin; el cliente solo ve disponible/no disponible. Por qué: no filtrar niveles de inventario a terceros y simplificar la ficha.
- Q: ¿entra el reorden de categorías en el admin mínimo? → Decisión: se difiere fuera de v1. Por qué: es gestión extra y el CRUD ya cubre operar; pasa a decisión diferida.
- Q: ¿la validación de disponibilidad es obligatoria o solo aviso? → Decisión: obligatoria y bloqueante hasta resolver. Por qué: evita generar pedidos imposibles.
- Q: ¿seguimiento público con número o solo dueño+admin? → Decisión: privado, sin consulta pública. Por qué: un modo público filtraría datos de pedidos de terceros.
- Q (área graduada de taxonomía datos y estado): ¿el invitado que cierra y vuelve conserva su cesta? → Decisión: sí, en el mismo navegador. Por qué: coherente con la fusión al login y reduce abandono.
- Validación de supuestos: los 4 se mantienen. Sin constitución: nada que citar, el riesgo sigue registrado.
- Por defecto propuesto sin pregunta (semántica de "retirar"): retirar categoría con productos o producto con movimientos exige confirmación explícita. Criterio de aceptación añadido.

---

## Anexo A — Enrutado de skills RSC para las fases siguientes (informativo, no es contrato)

> Este anexo NO forma parte del contrato WHAT/WHY y no lo evalúa `verify`. Existe solo porque se pidió dejar por escrito qué skills de `.rsc/skills/` deberán usarse. El `plan` lo convertirá en estrategia técnica; el `implement` lo ejecutará.

**Gobernanza del ciclo (proceso rsc-sdd):** `sdd` como dispatcher; `sdd-init` para crear `02-DOCS/wiki/sdd/config.yaml` antes de planificar; `constitution` para ratificar principios; `specify` (esta spec) → `clarify` (resuelto 2026-09-26) → `plan` → `tasks` → `analyze` (puerta cruzada) → `implement` (con TDD) → `verify` → `review` → `ship`. `debug` bajo demanda; `parallel` para sub-specs independientes; `worktrees` si se aísla el build.

**Construcción del frontal (stack real del repo: SPA + enrutador + almacén central + utilidades, validación con pruebas unitarias y de extremo a extremo):**

| Capacidad de la spec | Skills a activar en `plan`/`implement` |
|---|---|
| Componentes, límites, estados carga/vacío/error, formularios, actualizaciones optimistas | `ui-engineering` (cómo se construye la interfaz), `frontend-design` (calidad visual sin estética genérica) |
| Pantallas y piezas reactivas, props/emits, navegación con guards por rol | `vue`, `vue-best-practices` (Composition API como estándar) |
| Sesión persistente, cesta invitada + fusión, estado cliente/admin | `vue-pinia-best-practices` (almacenes y reactividad) |
| Diagnóstico de reactividad y estado | `vue-debug-guides` |
| Configuración y build del proyecto | `vite` |
| Tipos seguros de los modelos de la API (usuario, categoría, producto, cesta, pedido, estados) | `typescript-advanced-types` |
| Calidad base | `nodejs-best-practices`, `oxlint` |
| Pruebas unitarias de lógica (fusión de cesta, guards, resúmenes, formularios) | `vitest` |
| Flujos E2E (descubrir→comprar→seguir, admin, invitado→login) | `playwright-best-practices` |
| Accesibilidad mínima (teclado, lector, foco, formularios) | `accessibility` |
| Presentabilidad en buscadores (títulos, meta, datos estructurados de producto) | `seo` |
| Simplificar y desgenericar UI | `simplify-code`, `unslop` |
| Decisiones difíciles durante el build | `decision-challenge`, `clarify` |

**Descomposición recomendada en sub-specs (un ciclo corto por cada una tras esta paraguas):** autenticación y cuenta · catálogo y ficha · cesta y confirmación · pedidos y seguimiento · admin mínimo · shell IA-preparada. Cada sub-spec reutiliza esta tabla recortada a sus skills.

## Anexo B — Cobertura de la API por dominio (informativo, trazabilidad para `plan`)

> Solo orienta al `plan`. El contrato son los comportamientos de arriba, no esta tabla.

- Autenticación y sesión: registro, login con credenciales, renovación con token de refresco, usuario actual. La sesión se mantiene y renueva sin fricción.
- Usuarios: perfil propio (ver/editar), listado y detalle/edición/borrado para admin.
- Categorías: listado paginado con filtro de activas, jerarquía, raíces, detalle, subcategorías, categoría con productos, búsqueda por nombre, reorden (admin), crear/editar/borrar (admin).
- Productos: listado paginado con filtro de activos, búsqueda con filtros (texto, categoría, precios, destacado, disponibilidad, orden, paginación), destacados, stock bajo (admin), por categoría, detalle con categoría, por slug, por referencia, similares, crear/editar/borrar y ajuste de stock (admin).
- Cesta: cesta propia e invitada por sesión, líneas (añadir, editar cantidad, quitar por línea o por producto, vaciar), resumen, validación de disponibilidad, fusión de cesta de sesión al identificarse.
- Pedidos: crear desde cesta y directo, propios y detalle, todos (admin), por usuario (admin), actualizar, cambiar estado y estado de pago (admin), cancelar, seguimiento, estadísticas generales (admin).
- Salud: comprobación básica y de base de datos (para diagnóstico, no es flujo de usuario).

## Revisions

- 2026-09-26 — borrador inicial paraguas desde `openapi.json` + frontera respondida (IA preparada · cliente+admin · invitado+merge · gated). Sin constitución ni config: riesgo registrado como suposición.
- 2026-09-26 — `clarify`: spec aprobada por el usuario; 4 preguntas resueltas (stock bajo solo admin · reorden diferido · validación bloqueante · seguimiento privado), 1 área graduada y resuelta (invitado que vuelve conserva cesta), 4 supuestos validados, status → clarified.
