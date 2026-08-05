# Roadmap Tecnico

## Roadmap MCH Posventa v6

Este roadmap se ejecuta en orden. Un punto se marca como terminado cuando incluye modelo de datos, operacion interna, API MCH, migracion real aplicada y builds. Por acuerdo operativo, durante los puntos 3 al 8 no se regenera `publish/backend`; la publicacion copiable del backend se realiza una sola vez al completar el punto 9. Cada punto si se confirma mediante commit y push.

1. **Terminado - Vehiculos UIO e historial por chasis.** Maestro unico por VIN de 17 caracteres, motor, placa, marca/modelo, propietario vigente e historial, fecha de venta, kilometraje, sucursal, atenciones de taller/alistamiento y revisiones programadas. Endpoint: `GET /api/integrations/mch/vehicles`.
2. **Terminado - Catalogos formales de marcas y modelos.** Maestros cerrados por empresa, modelos dependientes de marca y relaciones explicitas con vehiculos, sucursales, articulos, ordenes, ventas, compras e inventario. Endpoints MCH: `GET /api/integrations/mch/brands` y `GET /api/integrations/mch/models`.
3. **Terminado - Ordenes de taller completas.** Numero visible, empresa/NIT historicos, recepcion y entrega prometida, tipo y origen, estados con historia, anulacion con motivo y responsable, pagador por linea, impacto en factura, revision asociada, tecnicos y tiempos estimados/reales. Endpoint: `GET /api/integrations/mch/service-orders`.
4. **Terminado - Garantias de fabricante.** Reclamacion asociada a vehiculo y orden de taller/alistamiento, tipo y deteccion, causa y pieza causante, piezas reemplazadas, estado propio de la marca con historia, autorizacion, radicacion, aprobacion/rechazo, valoracion, factura agrupable y pago. Endpoint: `GET /api/integrations/mch/warranties`.
5. **Terminado - Unidades e inventario.** Cantidades decimales, catalogo cerrado de unidades, conversiones compra/base/venta, sucursal como bodega, ubicaciones internas, saldos fisicos y movimientos trazables. Las entradas de mercancia exigen y conservan la ubicacion de recepcion; sus anulaciones revierten esa misma ubicacion. Endpoints MCH: `GET /api/integrations/mch/units`, `GET /api/integrations/mch/inventory` y `GET /api/integrations/mch/inventory-movements`.
6. **Pendiente - Catalogo avanzado de articulos.** Clasificacion cerrada, original/homologo/generico, fabricante, aplicabilidad, equivalencias, sustitutos, kits y reposicion.
7. **Pendiente - Ventas y compras completas.** En ventas: costo y marca por linea, clasificacion contable, devoluciones y notas credito relacionadas con el documento original. En compras: recepcion efectiva, pedido asociado, proveedor oficial o tercero y unidad exacta de compra por linea.
8. **Pendiente - Personal y datos empresariales.** Exponer el endpoint MCH de personal y completar NIT de empresas, marca principal de sucursales e identificacion de proveedores oficiales de cada marca.
9. **Pendiente - Requisitos operativos de la API.** Documentar endpoints, campos y tipos, rotacion y revocacion de credenciales, versionamiento, limites de uso, disponibilidad, ventana de mantenimiento, notificacion de cambios y ambiente de pruebas con datos representativos.

Siguiente punto activo: **6. Catalogo avanzado de articulos**.

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
