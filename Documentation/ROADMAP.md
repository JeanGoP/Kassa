# Roadmap Tecnico

## Roadmap MCH Posventa v6

Este roadmap se ejecuta en orden. Un punto se marca como terminado cuando incluye modelo de datos, operacion interna, API MCH, migracion real aplicada y builds. Por acuerdo operativo, durante los puntos 3 al 8 no se regenera `publish/backend`; la publicacion copiable del backend se realiza una sola vez al completar el punto 9. Cada punto si se confirma mediante commit y push.

1. **Terminado - Vehiculos UIO e historial por chasis.** Maestro unico por VIN de 17 caracteres, motor, placa, marca/modelo, propietario vigente e historial, fecha de venta, kilometraje, sucursal, atenciones de taller/alistamiento y revisiones programadas. Endpoint: `GET /api/integrations/mch/vehicles`.
2. **Terminado - Catalogos formales de marcas y modelos.** Maestros cerrados por empresa, modelos dependientes de marca y relaciones explicitas con vehiculos, sucursales, articulos, ordenes, ventas, compras e inventario. Endpoints MCH: `GET /api/integrations/mch/brands` y `GET /api/integrations/mch/models`.
3. **Terminado - Ordenes de taller completas.** Numero visible, empresa/NIT historicos, recepcion y entrega prometida, tipo y origen, estados con historia, anulacion con motivo y responsable, pagador por linea, impacto en factura, revision asociada, tecnicos y tiempos estimados/reales. Endpoint: `GET /api/integrations/mch/service-orders`.
4. **Terminado - Garantias de fabricante.** Reclamacion asociada a vehiculo y orden de taller/alistamiento, tipo y deteccion, causa y pieza causante, piezas reemplazadas, estado propio de la marca con historia, autorizacion, radicacion, aprobacion/rechazo, valoracion, factura agrupable y pago. Endpoint: `GET /api/integrations/mch/warranties`.
5. **Terminado - Unidades e inventario.** Cantidades decimales, catalogo cerrado de unidades, conversiones compra/base/venta, sucursal como bodega, ubicaciones internas, saldos fisicos y movimientos trazables. Las entradas de mercancia exigen y conservan la ubicacion de recepcion; sus anulaciones revierten esa misma ubicacion. Endpoints MCH: `GET /api/integrations/mch/units`, `GET /api/integrations/mch/inventory` y `GET /api/integrations/mch/inventory-movements`.
6. **Terminado - Catalogo avanzado de articulos.** Clasificacion jerarquica cerrada, origen original/homologo/generico, marca, fabricante, catalogo oficial, aplicabilidad por modelo y fuente, equivalencias, sustituciones con vigencia, referencias simples/kits con composicion, dimensiones, tiempos y parametros de reposicion. Endpoint MCH: `GET /api/integrations/mch/article-catalog`.
7. **Terminado - Ventas y compras completas.** Las ventas preservan descuento, costo, marca y clasificacion por linea; las devoluciones y notas credito referencian la factura original, controlan saldos parciales y solo la devolucion fisica reintegra inventario. Las compras conservan recepcion efectiva, pedido y fecha asociados, proveedor oficial/tercero con marca, ubicacion y unidad exacta por linea. Endpoints MCH: `GET /api/integrations/mch/sales` y `GET /api/integrations/mch/purchases`.
8. **Terminado - Personal y datos empresariales.** Endpoint consolidado de usuarios, tecnicos y jefes de taller con identificador estable, cargo, sucursal, estado y fechas UTC. El NIT es obligatorio al crear o editar empresas; sucursales exponen su marca principal y proveedores su condicion oficial/tercero. Endpoint MCH: `GET /api/integrations/mch/personnel`.
9. **Terminado - Requisitos operativos de la API.** Ruta canonica `/v1`, contrato consultable de campos/tipos, salud, fechas UTC explicitas, multiples claves para rotacion sin corte, revocacion, limite por credencial, HTTPS productivo, disponibilidad, mantenimiento, cambios y ambiente de pruebas documentados en `Documentation/MCH_API_OPERATIONS.md`. Al completar este punto se regenera `publish/backend`.

Roadmap MCH Posventa v6: **9 de 9 puntos terminados**.

## Prioridad Alta

- Cerrar brechas de cumplimiento frente a `Documentation/MCH_COMPLIANCE_MATRIX.md`.
- Cerrar todas las APIs internas con autenticacion.
- Rotar la clave de SQL Server que estuvo versionada.
- Mover secretos a variables de entorno o Secret Manager.
- Revisar permisos finos por modulo: ventas, compras, inventario, caja, reportes y administracion.
- Agregar transacciones en operaciones que modifican stock o caja.

## Prioridad Media

- Reducir advertencias de nulabilidad en backend.
- Corregir lint del frontend.
- Agregar pruebas de servicios para ventas, compras, stock, multiempresa y citas.
- Documentar despliegue de backend y frontend.

## Prioridad Baja

- Lazy loading por rutas en React para reducir el bundle inicial.
- Mejorar README funcional con capturas.
- Unificar idioma y mensajes de error.
