# rev74 — Dashboard de Recursos Humanos

Pantalla de inicio del perfil **HUMAN RESOURCES**. El endpoint también lo pueden consultar
GENERAL MANAGEMENT y el administrador.

## Indicadores
1. **Total de personal activo**, con el número de bajas registradas.
2. **Subtotal por perfil de puesto**: barras por "Puesto" de Control de Personal. También
   hay subtotal por área.
3. **Última contratación**: fecha de ingreso más reciente, con nombre y puesto. Debajo, las 5
   últimas.
4. **Última baja**: fecha de baja más reciente, con nombre y área. Debajo, las 5 últimas.
5. **Índice de rotación mensual por área**, últimos 12 meses:
   - índice = bajas del mes / plantilla promedio × 100, con plantilla promedio = (activos
     al inicio del mes + activos al fin) / 2;
   - mapa de calor (verde 0%, ámbar < 3% y 3–6%, rojo ≥ 6%), fila Total y rotación anual
     aproximada (bajas de 12 meses / plantilla promedio);
   - al pasar el mouse se ven bajas, altas y plantilla de cada celda;
   - las bajas sin fecha de baja no se pueden ubicar en un mes y se avisa cuántas son.
6. **Índice de horas extraordinarias semanal**, últimas 12 semanas, solo **Ensamble,
   Ingeniería Eléctrica, Ingeniería Mecánica y Manufactura**:
   - horas extra = lo que pasa de **48 h por persona en la semana** (jornada L-J 10 h,
     V 8 h), según Work Hours;
   - índice = horas extra / horas ordinarias;
   - gráfica de tendencia con selector de área (o las 4) y tabla semana por área;
   - última semana completa: horas extra, personas con extra y cuántas pasan de **9 h extra**
     (límite del art. 66 LFT);
   - el área de cada trabajador sale de su departamento en Hourly Rate y de la relación
     línea → área de Capacidad, igual que los índices de capacidad;
   - la semana en curso se marca con *.
7. **Asistencia del día**, desde el kiosco de asistencia:
   - por área: activos, con entrada, con permiso o vacaciones aprobados hoy y sin
     registro, con barra;
   - lista filtrable (sin registro / con permiso / con entrada / todos) con la hora de
     entrada;
   - % de asistencia en los indicadores de arriba;
   - si hoy es festivo de ley o fin de semana, lo indica;
   - si el kiosco no está configurado (`ATTENDANCE_URL`) o no responde, lo dice y muestra
     solo los permisos aprobados.

## Archivos
- `app.py`: `api_dashboard_rh()`, `DASH_RH_ROLES`, `RH_HORAS_SEMANA`, `RH_EXTRA_MAX_LFT`.
- `static/app.js`: `loadRHDashboard()`, `rhRender()` e `initHomeDashboard()` (perfil
  HUMAN RESOURCES).

## Cómo se probó
- PostgreSQL local con 12 trabajadores (2 bajas con fecha) y Work Hours de prueba de 3
  semanas.
- **Horas extra:** una persona con 58 h/semana da 10 h extra (marcada sobre el límite LFT) y
  otra con 54 h da 6 h. Total 16 h → 6.8%; Ensamble 10.4%; Ing. Mecánica 12.5%.
- **Rotación:** junio Manufactura 33.3% (1 baja con plantilla de 3); agosto Ensamble 66.7%;
  Total 10.0% y 10.5%.
- **Asistencia:** con un kiosco simulado, 6 de 10 con entrada (60%) por área, y la lista de
  "sin registro".
- Sin errores de JavaScript.
