# rev176 — BOM de Servicios Especializados y Timing tipo Microsoft Project

## 1. Requisiciones: BOM de Servicios Especializados
- **Compras ▸ Requisición de Compra:** pestaña nueva **"Serv. Especializados"**. También se puede
  elegir en **Subir Excel ▸ Tipo de BOM ▸ 🛠 Servicios Especializados**.
- **Funciona igual que los BOM de compra:** formato PURCHASED (BRAND, PART #, DESCRIPTION, QTY.),
  estatus, compras, bloqueo por fecha límite y Excel.
- **Aparece en los tableros de requisiciones** (Purchasing / WIP).
- **Al generar la OC,** sus renglones van con la categoría **Servicio**: se ligan o se dan de alta en
  el catálogo de Servicio.

## 2. Timing: 4 condiciones de fechas + desfase
- **Columnas nuevas:** **Condición**, **Actividad Posterior**, **Fecha Fin** y **Desfase ±d**.
- **Las 4 combinaciones válidas:**
  | Condición | Se captura | Cálculo |
  |---|---|---|
  | **Manual** | fecha inicial + días, o fecha inicial + **fecha fin** | sin dependencias; con fecha fin, los días se calculan |
  | **Inicio ← fin de la previa** | actividad previa + días | inicia el siguiente día hábil al terminar la previa |
  | **Fin → inicio de la posterior** | actividad posterior + días | **en retrospectiva:** termina el día hábil anterior al inicio de la posterior, e inicia N días hábiles antes |
  | **Entre previa y posterior** | previa + posterior | inicia al terminar la previa y termina antes de la posterior; **los días se calculan** |
- **Solo se habilitan los campos que usa cada condición;** los demás se atenúan.
- **Si una actividad "Entre" no cabe** (la posterior inicia antes de que termine la previa), se
  marca en rojo con el motivo.
- **Desfase (días hábiles):**
  - **+ = atraso** (más tarde), **− = adelanto** (más temprano), con botones − / + para ajustar
    en tiempo real;
  - se aplica al inicio (Manual, Inicio ← previa, Entre) o al fin (Fin → posterior);
  - **todas las actividades dependientes se recalculan al momento.**
- **Mensajes claros** cuando falta algo: "falta la previa", "la posterior no existe", "dependencia sin
  fecha o circular".
- **Gantt:**
  - flecha azul punteada de cada actividad hacia su **posterior**;
  - la ruta crítica incluye las actividades que terminan antes de una actividad crítica.
- **Se guardan las fechas resueltas** (`inicio_calc` / `fin_calc`), que usan el PDF del Gantt, la
  Línea de tiempo WIP y los reportes.
- **Las configuraciones anteriores siguen igual:** con previa y sin fecha → "Inicio ← previa"; lo
  demás → "Manual".

## 3. Vista tipo Microsoft Project
- **Botones "▦ Tabla + Gantt" / "▤ Vista Project",** y la barra **"⚙ Configuración de actividades"**
  para **colapsar** o expandir la tabla de configuración. La vista elegida se recuerda.
- **En Vista Project:**
  - la tabla se oculta y el Gantt queda como en Project: a la izquierda **Actividad · Duración ·
    Inicio · Fin** (fijas al desplazar);
  - las fechas condicionadas aparecen en azul, y el desfase junto al nombre (+2d en rojo, −1d en
    verde);
  - **clic en una actividad (nombre o barra)** → **panel lateral** para editarla: nombre, grupo,
    condición, previa/posterior, fechas, días, **desfase − / +**, recursos, fecha real y cumplido.
    El Gantt se actualiza al momento.
- **Solo lectura** si el usuario no tiene permiso de edición en Timing.

## Probado
- **Timing:**
  - A Manual 01-dic + 5 d → 01–07 dic;
  - B "Inicio ← A", 3 d → 08–10 dic;
  - D Manual 15-dic, 4 d;
  - C "Fin → D", 2 d → **11–14 dic** (en retrospectiva, salta el fin de semana);
  - E "Entre B y D" → 11–14 dic, **2 d calculados**;
  - F Manual 01–04 dic → **4 d calculados**.
- **Desfase:**
  - B con **+2** → 10–14 dic; E queda **en conflicto** (marcado);
  - en el panel lateral, **−2** → B regresa a 08–10 dic.
- **Al guardar** se envían modo, desfase, posterior e inicio/fin calculados.
- **Vista Project:** tabla oculta, columnas Duración/Inicio/Fin y panel lateral funcionando.
- **BOM Servicios Especializados** (PostgreSQL): carga de 2 renglones OK; un tipo inválido se rechaza.
