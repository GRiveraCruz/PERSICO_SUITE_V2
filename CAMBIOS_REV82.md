# rev82 — ATTENDANCE_URL sin "https://" y aviso de base de datos distinta

- **`ATTENDANCE_URL` se acepta con o sin protocolo.** "sko-permex.up.railway.app" se
  convierte en "https://sko-permex.up.railway.app". También se quitan espacios, comillas
  y la "/" final. Antes, "Sincronizar trabajadores" fallaba con "Invalid URL … No scheme
  supplied".
- **Estado de Asistencia** (`/api/asistencia/status`): si la Suite sigue hablando con el
  kiosco por HTTP pero el kiosco ya es la versión con base de datos, devuelve un aviso. Eso
  significa que el kiosco no está usando la misma base que la Suite, así que hay que
  revisar su `DATABASE_URL`.
- Con el kiosco v2 conectado a la misma base, la Suite no usa `ATTENDANCE_URL`: lee los
  registros directamente y "Sincronizar" responde que ya no es necesario.
