# rev110 — Respaldo de archivos del volumen (ZIP)

## Por qué
- El respaldo de la base de datos (`pg_dump`) **no incluye** los archivos que se suben a la
  Suite. Viven en el volumen de Railway (`/app/data` = `DATA_DIR`), que sí sobrevive a los
  despliegues pero no queda en el respaldo:
  - XML de CFDI;
  - documentos de Jobs y de cierre;
  - archivos de cotizaciones;
  - documentos de personal, perfiles y permisos;
  - documentos de SV y de proveedores;
  - documentos de Configurar Proyecto.

## Qué hay
- **Config ▸ Administrador ▸ "💾 Respaldo de archivos"** (solo el administrador):
  - **Resumen:** número de archivos y tamaño por tipo (XML de CFDI, Jobs, cotizaciones,
    Configurar Proyecto, SV, proveedores, personal/perfiles/permisos y otros), además del
    espacio usado del volumen;
  - **"⬇ Descargar respaldo completo (ZIP)":** todo lo que hay en la carpeta de datos;
  - **"⬇ Solo documentos y XML":** sin los JSON de respaldo del modo sin base de datos.
    Es más ligero;
  - **fecha y usuario del último respaldo** descargado.
- **El ZIP incluye `MANIFIESTO.txt`:** fecha, usuario, carpeta y cada archivo con su
  tamaño y su huella SHA-1, para verificar después que el respaldo está completo.
- **Seguridad:**
  - la llave interna de sesiones del servidor (`.flask_secret_key`) **nunca** se incluye;
  - solo el administrador puede ver el resumen o descargar.
- **El ZIP se arma en un archivo temporal**, no en memoria, y se envía por partes. El
  temporal se borra al terminar, también si se corta la descarga.

## Rutina sugerida de respaldo
1. `pg_dump` de la base de datos (como ya lo haces).
2. Config ▸ Administrador ▸ Descargar respaldo completo (ZIP).
3. Guarda los dos archivos juntos, con la fecha.

## API
- `GET /api/admin/respaldo-archivos/info` — resumen.
- `GET /api/admin/respaldo-archivos` — ZIP completo. Con `?solo=documentos`, solo
  documentos y XML.

## Probado
- **Carpeta de prueba:** 61 archivos (5 XML de CFDI, 40 de Jobs, 16 JSON).
- **ZIP completo:** 62 entradas (incluido el manifiesto), sin la llave de sesiones.
- **Solo documentos:** 46 entradas (XML, Jobs y el manifiesto).
- **Sin sesión de administrador:** rechazado.
- **El archivo temporal se borra** después de la descarga.
