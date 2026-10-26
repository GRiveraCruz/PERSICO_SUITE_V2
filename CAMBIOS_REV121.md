# rev121 — Términos de pago (milestones) por Job y Órdenes de cobro

## 1. Configurar Proyecto ▸ Presupuesto ▸ cada Job ▸ "TÉRMINOS DE PAGO"
- **Lista de milestones de pago** por Job (botón "+ Milestone"):
  1. **Nombre del milestone**, por ejemplo Anticipo, Aceptación en planta, Run-off;
  2. **Porcentaje de cobro**;
  3. **Fecha estimada** de cumplimiento;
  4. **Check "Cumplido"**: al marcarlo se guarda la fecha de cumplimiento;
  5. **Botón "Generar orden de cobro"**: se habilita al marcar el milestone como cumplido.
- **Monto estimado** de cada milestone = % × revenue del Job.
- **Suma de porcentajes:** en verde al llegar a 100 %; en ámbar si falta y en rojo si pasa.
- **Se guardan con "Guardar configuración"**, como el resto del presupuesto.
- **Milestone con orden generada:**
  - queda **bloqueado**: nombre, %, cumplido y no se puede borrar;
  - muestra el folio de la orden con enlace a su PDF;
  - el servidor conserva esa liga aunque alguien guarde la configuración con una pantalla
    abierta desde antes.

## 2. Generar la orden de cobro (modal)
- **Datos que se heredan del milestone:**
  - **CPO** del Job (si hay varias, se elige; se avisa si la CPO es TBD);
  - **número de Job**;
  - **nombre y porcentaje** del milestone.
- **Datos que pide al usuario:**
  - **archivo de evidencia** de aceptación o entrega, obligatorio. Se aceptan PDF, imagen,
    Excel, Word, correo o ZIP, hasta 25 MB;
  - **¿Requiere IVA?** (Sí 16 % / No), obligatorio;
  - notas (opcional).
- **Montos:** el modal muestra "N % de la CPO … ($…)", el subtotal, el IVA y el total en USD.
- **El servidor valida:**
  - que el milestone esté guardado y cumplido;
  - que tenga porcentaje;
  - que no tenga ya una orden;
  - que la CPO sea del Job.

## 3. Finanzas ▸ Órdenes de cobro (apartado nuevo)
- **Lista de órdenes:**
  - columnas: folio **ODC-…**, fecha, Job, CPO (y su PO), cliente, milestone y %,
    subtotal, IVA, total y estatus;
  - búsqueda y filtro por estatus;
  - resumen de lo pendiente por facturar.
- **Estatus:** **Por facturar → Facturada** (con su factura CPC) o **Cancelada**.
- **Acciones por orden:**
  - **PDF** de la orden;
  - **Evidencia**: abre el archivo;
  - **"Registrar factura"**: abre CPC ▸ Nueva factura ya llenado (CPO ligada, Job,
    cliente, subtotal, IVA y nota con la orden). **Al guardar la factura, la orden queda
    Facturada** con su CPC;
  - **"Cancelar"** (permiso total, con motivo): solo órdenes por facturar. El milestone
    queda libre para generar otra orden. Una orden facturada no se puede cancelar.
- **Bitácora:** generada, facturada y cancelada, con usuario y fecha.
- **Evidencias:** se guardan en el volumen (`FINANZAS/ordenes_cobro/<folio>/`) y se incluyen
  en el **respaldo de archivos** de Administrador.

## Ajuste en CPC
- **Serie y Folio** quedan siempre visibles en la factura, también cuando se liga a una CPO.
  Antes se ocultaban junto con Job y Cliente.

## Permisos
- Módulo nuevo `fin-ordenes-cobro`. Mientras no se le fije un nivel, toma el de **CPC**.
- Generar la orden lo puede hacer quien edite el Presupuesto o quien tenga Crear en
  Órdenes de cobro.

## Probado
- **Job 652-50** con 3 milestones: Anticipo 30 % (cumplido), Aceptación 50 % y Run-off
  20 % → suma 100 %.
- **Orden del Anticipo** sobre la CPO de $148,000 con IVA → **ODC-0000000001**: subtotal
  $44,400, IVA $7,104, total $51,504.
- **Milestone bloqueado** con su folio. Al volver a guardar la configuración, la liga se
  conservó.
- **"Registrar factura"** → CPC llenado. Al guardar → orden **Facturada** con CPC-0000000001.
- **Validaciones:**
  - milestone no cumplido → rechazado;
  - segunda orden del mismo milestone → rechazada;
  - sin evidencia → rechazado;
  - cancelar una facturada → rechazado.
