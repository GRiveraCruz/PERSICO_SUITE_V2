# rev153 — Almacenes ▸ Piezas de Cliente (entradas, salidas, devoluciones y scrap)

## Qué es
- **Apartado nuevo en Almacenes,** con su propia tabla en la base de datos (`piezas_cliente_mov`;
  en modo JSON: `PIEZAS_CLIENTE.json`), para las **piezas que entrega el cliente** para un Job.
- **Funciona como libro de movimientos:**
  - entrada (+), salida (−), reingreso (+), devolución (−) y scrap (−);
  - el **disponible** por Job y pieza es la suma de sus movimientos;
  - el historial completo se conserva.

## ＋ Entrada
- **Fecha de ingreso:** automática.
- **Obligatorios:** **Job Number**, **tipo de pieza / No. de parte / ID** y **número de piezas
  ingresadas**.
- **Opcionales:** **unidad de medida** (Pieza, Juego, Kit, Caja, Tarima, Kg, Metro, Lote),
  **¿se deben devolver al cliente?** (Sí/No), descripción y notas.
- **Varias entradas de la misma pieza en el mismo Job** se acumulan. Se reconocen sin importar
  mayúsculas ni espacios.

## ➖ Salida
- **Fecha de salida:** automática. **Obligatorio:** Job Number.
- **Al escribir el Job,** se muestran sus **piezas disponibles**. Se captura la cantidad de cada
  una, sin pasar lo disponible; el servidor también lo valida.
- **Opcionales:** destino o referencia, y notas.
- **Al procesar,** las piezas se restan y queda el movimiento en su historial.

## ↩ Devolución / Scrap
- **Al escribir el Job Number,** se muestran sus piezas con disponible y las que están **fuera del
  almacén** (sacadas y no reingresadas).
- **Por pieza:**
  - **piezas reingresadas** (no más de las que están fuera);
  - **acción:** **Devolución al cliente** (preseleccionada si la pieza se marcó para devolver) o
    **Scrap**.
- **Opcionales:** documento o guía de devolución, y notas.
- **Al procesar:**
  1. se registra el **reingreso**;
  2. sale **todo lo disponible + lo reingresado** como devolución o scrap, con la **fecha de
     devolución**;
  3. **la pieza queda en cero.**

## Pantalla principal
- **Tarjetas:** Jobs con piezas, tipos con existencia, piezas disponibles y piezas por devolver.
- **Tabla por Job y pieza:** entradas, salidas, reingresos, devueltas, scrap, **disponible**,
  ¿devolver?, cierre (devuelta o scrap, con fecha) y último movimiento.
  - Casilla "ver en cero" y búsqueda.
- **Clic en un renglón → historial:** fecha, movimiento, cantidad, **saldo**, usuario y
  destino/notas.

## Permisos y API
- **Permisos:** módulo `piezas-cliente` (pestaña Almacenes). Mientras no se le fije un nivel, toma
  el de Salida de Material.
- **API:**
  - `GET /api/piezas-cliente[?job=]`
  - `GET /api/piezas-cliente/historial?job=&pieza=`
  - `POST /api/piezas-cliente/entrada`
  - `POST /api/piezas-cliente/salida`
  - `POST /api/piezas-cliente/devolucion`

## Probado
- **Validaciones de entrada:** sin Job → rechazado; Job inexistente → rechazado.
- **Movimientos de prueba:**
  - **entradas:** Panel GMC 84512 ×20 (devolver = Sí) + ×5 (misma pieza escrita en minúsculas) =
    25, y Clip 7781 ×100;
  - **salidas:** de 30 paneles → rechazada ("solo hay 25"); de 8 paneles y 40 clips → disponible
    17 y 60;
  - **devolución:** reingresar 10 → rechazado ("solo han salido 8"); **devolución con 3
    reingresadas** → salen 20 paneles y la pieza queda en **0**; **scrap** de clips → 60 y queda
    en **0**.
- **Historial del panel:**
  - entrada 20 → saldo 20;
  - entrada 5 → saldo 25;
  - salida 8 → saldo 17;
  - reingreso 3 → saldo 20;
  - devolución 20 → saldo **0**.
