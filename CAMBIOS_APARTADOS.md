# Cambios — "El ingreso de materiales ya no genera apartados" (rev35 → rev36)

## Diagnóstico
**El servidor sí crea los apartados.** Se verificó `POST /api/ingreso` en PostgreSQL:
un ingreso de 3 piezas de una OC deja el apartado con 3 piezas para el Job, y
`GET /api/apartados` lo regresa.

**El problema era la pantalla.** La lista de Apartados solo se cargaba **una vez, al
abrir la suite**:
- Procesar un ingreso (manual, por OC o por SAE) no la volvía a consultar.
- Entrar al módulo Apartados tampoco.

Resultado: después de un ingreso, Apartados seguía mostrando la lista de cuando se inició
sesión, sin el material nuevo, hasta recargar la página (F5).

Reproducido en Chromium con la suite abierta: ingreso por OC → entrar a Apartados.
- **rev35:** el material **no** aparece.
- **rev36:** sí aparece.

## Corrección
- **Al entrar al módulo:** la lista de Apartados se consulta al servidor cada vez.
- **Después de cada ingreso:** también se recarga, tanto en el manual como en el de OC
  (GPO) y en el de SAE, y al eliminar un ingreso.

## Archivos
- `static/app.js`: hook de `switchMenu('apartados')`, y `ipoProcesar()`,
  `saeProcesar()`, el ingreso manual y `deleteIngreso()` recargan Apartados.

## Si después de desplegar rev36 sigue sin aparecer
Entonces sería otro caso. Indicar:
- Qué tipo de ingreso se hizo (manual, OC o SAE).
- El mensaje que muestra al procesarlo (debe decir "N item(s) en Apartados").
- Si el material aparece después de recargar con F5.
