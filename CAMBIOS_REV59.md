# rev59 — Mano de Obra: la importación de Excel decía "importados" pero no guardaba nada

## Causa
El archivo `HORAS_LUZ.xlsx` trae la columna **ID vacía**, como algunos reportes del
sistema de horas.
- En la base de datos, cada registro de Work Hours se guarda con la llave "año_ID".
  `wh_save()` **descartaba en silencio** todo registro sin ID.
- La importación contaba los renglones leídos y respondía "16 importados, total 4,569",
  pero en la tabla no quedaba ninguno.
- Reproducido con PostgreSQL local: antes 25 registros de Luz, después de importar dos
  veces seguían 25.
- **Riesgo mayor del mismo error:** en modo **Reemplazar**, un archivo sin IDs habría
  borrado **todo el año** y no habría insertado nada.

## Corrección
1. **ID automático para registros sin ID.**
   - El ID sintético es determinista: mismo empleado, fecha, work code, descripción y
     número de aparición dan el mismo ID. Re-importar el mismo archivo en modo "Agregar"
     **actualiza sin duplicar**.
   - Usa el rango reservado 1,000,000,000–1,999,999,999, así que no choca con los IDs del
     sistema de origen. Control de Horas sigue numerando fuera de ese rango.
   - Si un ID ya lo tiene otro registro, se toma el siguiente libre.
2. **`wh_save()` ya no descarta registros sin ID**: les asigna uno (protección para
   cualquier otro camino de guardado).
3. **Verificación real:** después de guardar se relee la tabla. Si algún registro importado
   no quedó guardado, la importación responde **error** en lugar de "importados". El
   "Total tabla" es el conteo real guardado.
4. **Renglones sin horas** (celda vacía o 0) ya no se importan como registros de 0 h. Se
   informan aparte. El archivo trae uno (27/06/2026).
5. **Homologación de nombres.** "43LUZ AILED MUÑOZ RODRIGUEZ" debe quedar como
   **"MUÑOZ RODRIGUEZ LUZ AILED"**, igual que sus registros anteriores, para que el Job
   Report encuentre su tarifa y agrupe sus horas.
   - La lista canónica se leía directo del archivo JSON de Hourly Rate. En la base de datos
     ese archivo no existe o está viejo, la lista quedaba vacía y el nombre no se
     homologaba. Ahora se lee con `load_rates()`, que usa la base.
   - Además se usan los nombres que ya existen en Work Hours del año. Así un empleado sin
     tarifa también conserva el mismo nombre de siempre.
   - El caché de homologación ya no conserva un resultado malo hasta reiniciar el servidor.
6. **Mensajes del modal:** cuántos renglones venían sin horas, cuántos registros recibieron
   ID automático y si hay fechas de un año distinto al seleccionado.

## Cómo se probó (PostgreSQL 16 local, con los datos de data_seed migrados)
- Con el código anterior se reprodujo el error: "16 importados", 0 guardados.
- Con la corrección, `HORAS_LUZ.xlsx` en modo Agregar:
  - 15 registros guardados como "MUÑOZ RODRIGUEZ LUZ AILED" (1 renglón sin horas omitido);
    Luz pasa de 25 a 40 registros;
  - la segunda importación del mismo archivo no duplica (siguen 40).
- Homologación con la lista de la base: "12DELFINO HERNANDEZ SERRANO" →
  "HERNANDEZ SERRANO DELFINO".
- Modo sin base de datos: mismo resultado.

## Archivos
- `app.py`:
  - nuevas: `_wh_asignar_ids()`, `_wh_llave()`, `WH_ID_SINT_MIN/MAX`;
  - cambian: `wh_save()`, `api_import_wh()`, `_get_canonical_employees()`,
    `_homologar_empleado()` y el cálculo de `max_id` en la exportación de Control de Horas.
- `static/app.js`: `whRunImport()` muestra los avisos nuevos.
