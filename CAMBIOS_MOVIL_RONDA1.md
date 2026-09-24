# CAMBIOS_MOVIL_RONDA1.md — Versión móvil, Módulo 1: Jobs

## Decisión de arquitectura

Se creó una página nueva y separada (`/mobile`, sirve `static/mobile/index.html`) en
vez de intentar que la Suite de escritorio (48 módulos, tablas anchas, formularios
grandes) se reacomode sola en una pantalla de teléfono. Motivos:

- La Suite de escritorio reutiliza los **mismos endpoints `/api/*`** y la **misma
  sesión de login** — no hay backend nuevo que mantener, ni una segunda fuente de
  datos.
- Se puede construir bien un módulo a la vez, como pediste, sin arriesgar romper la
  experiencia de escritorio que ya funciona.
- Es mucho más liviana: la página completa (HTML+CSS+JS en un solo archivo) pesa una
  fracción de lo que pesa cargar `app.js` (14,000+ líneas) en una conexión de datos
  móvil.

## Qué incluye esta primera ronda (módulo Jobs)

- **Ver Jobs:** lista con búsqueda (por número de job, cliente, descripción, PM) y
  filtro por estatus (Abiertos/Cerrados/Todos) — usa los mismos parámetros `q`,
  `status`, `limit`, `offset` de `/api/jobs` que ya se optimizaron en una ronda
  anterior de esta conversación.
- **Ver detalle de un Job:** al tocar una tarjeta, se abre una hoja con más campos
  (descripción, PM, status, aprobación FC, fecha de entrega, notas).
- **Aprobar un Job:** si el Job está en estatus de aprobación "ToApprove" y el usuario
  tiene permiso de edición sobre el módulo "jobs", aparece un botón "Aprobar" que
  cambia ese campo a "Yes" — con confirmación antes de ejecutar, y aviso de qué SÍ y
  qué NO hace (no crea ventas, no modifica otros datos).
- **Cotizaciones y Horas:** aparecen en la barra de navegación inferior, marcadas
  "próx." (próximamente) — la estructura de navegación ya está lista para agregarlas
  en las siguientes rondas, pero no se construyeron todavía (ver más abajo el porqué).

## Por qué "Aprobar Job" y NO "Aprobar Cotización" en esta primera ronda

Al revisar el código encontré que "aprobar una cotización" en esta Suite en realidad
dispara `/api/workflow/award` — un proceso de varios pasos que marca la cotización
como adjudicada, **crea automáticamente una Venta (CPO), crea Jobs nuevos, y asigna
números PT/SV**, todo junto. No es un simple cambio de estatus — es una decisión de
negocio con varios efectos en cascada, y me pareció genuinamente riesgoso convertir
eso en un botón de un solo tap en el teléfono, donde es más fácil tocar algo sin
querer o sin ver el contexto completo.

En cambio, Jobs sí tiene un campo de aprobación simple y aislado (`approval_fc`:
ToApprove → Yes) que no dispara nada más — ideal para "aprobar sobre la marcha" sin
riesgo de crear registros de más por accidente.

**Necesito tu confirmación antes de construir "Cotizaciones" en la siguiente ronda:**
¿el "aprobar" que tenías en mente para cotizaciones es de verdad disparar todo el
flujo de adjudicación (Venta + Jobs + PT/SV) desde el teléfono, o hay algún paso
intermedio más simple (por ejemplo, solo marcar que se aprobó internamente, dejando la
adjudicación formal para hacerla después en la computadora)? Prefiero preguntarte esto
antes de adivinar y construir algo que no sirva para lo que necesitas.

## Seguridad y calidad — corregido de una vez, no solo para el móvil

Al construir esto encontré que `PUT /api/jobs/<job_number>` (el endpoint que usa el
botón "Aprobar") tenía el mismo problema documentado en `AUDITORIA.md` (P0-3):
ninguna verificación de permisos del lado del servidor. Se agregó
`can("edit", "jobs")` — esto protege tanto al escritorio como al móvil por igual.
**Verificado con prueba real:** un usuario sin permiso de edición recibe 403 y ni
siquiera ve el botón "Aprobar" en el teléfono (doble protección: no se muestra en la
interfaz, y aunque alguien intentara llamar la API directo, el servidor la rechaza).

También se corrigieron, para que el flujo de login funcione bien con `/mobile`:
- `/login` ahora acepta `?next=` y redirige ahí después de iniciar sesión (antes
  siempre mandaba a la vista de escritorio, sin importar de dónde vinieras). Se validó
  que ese parámetro no pueda usarse para redirigir fuera del propio sitio (protección
  anti "open redirect").

## Decisiones de diseño para que esto sea sólido, no solo bonito

- **El campo de búsqueda tiene su propio debounce, explícito y aislado** (300ms,
  solo en ese input) — a propósito, para NO repetir el problema documentado en
  `AUDITORIA.md` P1-4 (el debounce global del escritorio intercepta TODOS los campos
  de texto y puede bloquear otros listeners).
- **El fetch de esta página sí distingue 401/403/errores no-JSON** — a propósito, para
  NO repetir el problema de `apiCall()` documentado en P1-5. Si la sesión expira a
  medio uso, redirige al login preservando a dónde ibas; si no tienes permiso, muestra
  el mensaje real del servidor.
- Botones y tarjetas con área de toque de al menos 44px de alto.
- Respeta `prefers-reduced-motion` (desactiva transiciones/animaciones si el sistema
  operativo lo pide).
- Área segura de pantallas con notch/cámara (`env(safe-area-inset-*)`).

## Cómo probarlo

Entra a `https://tu-app.up.railway.app/mobile` desde el navegador del teléfono (no
hace falta instalar nada). Si no habías iniciado sesión, te manda al login y luego de
vuelta a `/mobile` automáticamente.

## Pruebas ejecutadas (locales, contra datos sintéticos)

| Prueba | Resultado |
|---|---|
| `/mobile` sin sesión | Redirige a `/login?next=/mobile` |
| Login con `next` | El formulario conserva el destino correctamente |
| `/mobile` logueado | 200, sirve la página |
| `/api/jobs` con filtros desde el móvil | Funciona igual que desde escritorio |
| Aprobar un Job como admin | 200, campo actualizado |
| Aprobar un Job como usuario sin permiso | 403 "Sin permiso" — y el botón ni aparece en la interfaz |

**Lo que no pude probar:** el renderizado visual real en un teléfono (este entorno no
tiene navegador). Probé la lógica y las respuestas del servidor de punta a punta, pero
te pido que le eches un ojo visual en tu propio teléfono antes de darlo por bueno del
todo — especialmente el tamaño de texto, el comportamiento del teclado al buscar, y
que la hoja de detalle se vea bien en pantallas chicas.

## Próximas rondas (pendiente, en orden sugerido)

1. Confirmar el alcance de "aprobar cotizaciones" (pregunta de arriba) y construirlo.
2. Módulo "Horas" — consultar horas trabajadas propias o de un equipo, sin edición
   compleja (encaja bien con "checar horas sobre la marcha").
3. Notificaciones/badges (ej. cuántos Jobs están "por aprobar" ahora mismo).
