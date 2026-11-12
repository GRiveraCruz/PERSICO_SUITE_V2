# rev148 — Alta automática en el catálogo al emitir una orden de compra

## Antes
- **Un componente o servicio que no estaba en el catálogo** (Eléctrico CE, Mecánico CM, Servicios
  CS) solo quedaba en la OC y en Purchase Orders.
- **El catálogo no cambiaba:** no se le asignaba código y no guardaba su precio.

## Ahora (Generar Orden de Compra)
- **Al emitir la OC, cada renglón sin código de catálogo** que tenga **No. de parte** y categoría
  **eléctrico / mecánico / servicios**:
  1. **Si ya existe** en su catálogo el mismo No. de parte y marca (se comparan sin espacios ni
     guiones; si alguno no tiene marca, basta el No. de parte), el renglón **se liga a ese
     código** y se actualiza su **último precio** (y moneda).
  2. **Si no existe,** se **da de alta** con el siguiente código (CE-/CM-/CS-#####), con No. de
     parte, marca, descripción, etiqueta, precio, moneda y **proveedor**, marcado **"Nuevo — por
     revisar"** (`por_revisar`, `origen: "OC"`, quién y cuándo).
  - **En ambos casos,** el renglón de la OC (y su registro en Purchase Orders) queda con su
    **código de catálogo**.
- **En la lista de renglones de la OC,** los que se darán de alta muestran **"＋ nuevo"**, con la
  casilla **"no agregar"** para compras que no conviene guardar (servicios o compras únicas).
- **Al emitir,** el aviso indica cuántos materiales se dieron de alta y sus códigos.
- **No se dan de alta:**
  - renglones sin No. de parte;
  - renglones marcados "no agregar";
  - **Componentes mayores**, porque no tienen catálogo propio.

## Catálogos (Eléctrico / Mecánico / Servicios)
- **Los materiales dados de alta desde una OC** muestran la etiqueta **"NUEVO · POR REVISAR"**, con
  el proveedor al pasar el mouse. Al hacer clic se marca como **revisado** (queda quién y cuándo).
- **Junto al contador** aparece "**N por revisar**", con una casilla para ver solo esos.

## Probado
- **OC con 4 renglones:**
  - Perfil Misumi (mecánico, nuevo) → **alta CM-00001** "por revisar", proveedor MISUMI MX;
  - CPU Siemens "6ES7214-1AG40" (existía como "6ES7 214-1AG40") → **ligado a CE-00001** y precio
    actualizado a $455;
  - servicio con "no agregar" → no se dio de alta;
  - componente mayor → no se dio de alta.
- **Segunda OC con "MISUMI HFS5 2020"** → ligada a CM-00001, **sin duplicar**.
- **Marcar revisado** → `por_revisar` false.
