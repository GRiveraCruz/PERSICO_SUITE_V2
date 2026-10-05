# rev81 — Conexión kiosco → Suite: llave tolerante y diagnóstico

- `ATTENDANCE_SYNC_KEY` y la llave que manda el kiosco se comparan sin espacios ni
  comillas al inicio o al final. Al pegar un valor en Railway es fácil que se cuele un
  espacio o unas comillas y la llave deja de coincidir sin que se note.
- **Nuevo** `GET /api/kiosco/ping` (con `X-Sync-Key`). No revela la llave; solo dice:
  - si la Suite no tiene configurada `ATTENDANCE_SYNC_KEY`;
  - si la llave no coincide, junto con el largo de cada una para comparar;
  - o `ok: true`.
- El kiosco v2.2 muestra este resultado en `/api/estado` → `conexion_suite`.
- Probado: con la llave de la Suite " clave123 " (con espacios) y la del kiosco
  "\"clave123\"" (con comillas) → ok. Con una llave distinta → mensaje de que no coincide,
  con los largos 4 vs 8.
