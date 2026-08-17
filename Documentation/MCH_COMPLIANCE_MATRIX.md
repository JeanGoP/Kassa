# Matriz De Cumplimiento MCH Posventa v6

Fuente normativa: `Documentation/specs/Especificacion_API_Posventa_MCH_v6.docx`.

Extraccion auxiliar: `Documentation/specs/Especificacion_API_Posventa_MCH_v6.extracted.md`.

Ultima revision: 2026-08-17.

Estados:

- Cumple: el sistema/API ya expone o soporta razonablemente el requisito.
- Parcial: existe una primera capa, pero faltan campos, reglas o documentacion.
- No cumple: no hay soporte actual claro en modelo o API.
- Requiere decision: depende de definicion operativa, despliegue o alcance acordado con MCH.

## Resumen Ejecutivo

La integracion MCH existente es una primera capa readonly util, pero aun no cumple totalmente la especificacion v6. Lo mas importante ya presente es: endpoint REST JSON, API key, paginacion, filtro por empresa/sucursal/fechas/modificado_desde en varios recursos, datos base de empresas, sucursales, terceros, catalogo, inventario, ventas, compras y ordenes de servicio.

Brechas principales:

- Vehiculo maestro por VIN/chasis y catalogos formales de marca/modelo implementados y relacionados.
- El catalogo avanzado de articulos ya cubre clasificacion cerrada, origen, fabricante, aplicabilidad, equivalencias, sustituciones, kits y reposicion.
- Garantias de fabricante ya cubren el ciclo desde deteccion hasta factura y pago; los registros anteriores a la migracion se exponen como historicos incompletos sin suponer datos.
- Unidades cerradas, conversiones compra/base/venta, cantidades decimales y kardex por sucursal/ubicacion ya estan implementados. Las entradas de mercancia seleccionan una ubicacion de recepcion explicita y la conservan para trazabilidad y reversos.
- Las ventas ya preservan devoluciones y notas credito ligadas al documento original; las compras conservan recepcion efectiva y pedido asociado.
- Personal y datos empresariales ya estan expuestos; la API cuenta con contrato de campos/tipos y politica operativa de versionamiento, limites, rotacion, disponibilidad y sandbox.

## Requisitos Transversales

| ID | Requisito | Estado | Evidencia / Brecha |
| --- | --- | --- | --- |
| MCH-T01 | API REST sobre HTTPS, JSON | Cumple | API JSON y redireccion HTTPS en produccion respetando `X-Forwarded-Proto`; ruta canonica `/api/integrations/mch/v1`. |
| MCH-T02 | Credencial de servicio readonly para MCH | Cumple | Usa `X-MCH-API-Key`; todos los endpoints son `GET` y el alcance se resuelve con `AllowedTenantIds`. |
| MCH-T03 | Aislamiento por credencial en servidor | Cumple | `ValidateAccess` exige API key y ahora exige `AllowedTenantIds`; `ApplyTenantScope` siempre filtra por tenants autorizados. |
| MCH-T04 | Alcance ampliable a nuevas razones sociales | Cumple | `Integrations:MCH:AllowedTenantIds` permite varios tenants sin cambiar respuestas. |
| MCH-T05 | Revocacion y rotacion documentada | Cumple | `ApiKeys` admite convivencia de clave vigente/nueva y el procedimiento esta en `MCH_API_OPERATIONS.md`. |
| MCH-T06 | Disponibilidad y ventana de mantenimiento | Cumple | `/health`, objetivo, ventana, avisos, codigos y recuperacion estan definidos en `MCH_API_OPERATIONS.md`. |
| MCH-T07 | Filtros empresa, marca, sucursal, fechas, modificado_desde | Cumple | `MchQuery` aplica los filtros transversales en los recursos correspondientes, incluida marca formal en sucursales, articulos, inventario, ventas, compras, vehiculos y ordenes. |
| MCH-T08 | Paginacion obligatoria | Cumple | `PageSize`, `ContinuationToken`, `NextContinuationToken`. |
| MCH-T09 | Identificadores estables | Cumple | Usa IDs internos no reutilizados; personal usa IDs compuestos con origen documentado. |
| MCH-T10 | creado_en y modificado_en con zona horaria | Cumple | El filtro MCH serializa `DateTime` y `DateTimeOffset` en ISO 8601 UTC y responde `X-MCH-Time-Zone: UTC`. |
| MCH-T11 | Anulaciones/eliminados siguen consultables | Parcial | Las ordenes de taller anuladas conservan fecha, motivo, responsable e historial y siguen disponibles en MCH; falta completar el mismo patron en ventas, compras y otros documentos. |
| MCH-T12 | Valores monetarios indican IVA | Parcial | Ventas/compras exponen impuestos en lineas; no todos los recursos indican si incluyen IVA. |
| MCH-T13 | Todo recurso trae empresa, marca y sucursal | Cumple | Empresa y sucursal se exponen por hecho; la marca se toma del vehiculo o de cada articulo/linea y nunca se infiere desde la sucursal. |
| MCH-T14 | Cantidades numericas decimales | Cumple | Stock, ventas, compras, partes de taller, alistamientos, garantias y movimientos usan cantidades decimales y conservan cantidad en unidad base. |
| MCH-T15 | Unidades cerradas y por registro | Cumple | `UnitsOfMeasure` es catalogo cerrado por empresa; cada linea y movimiento conserva unidad declarada, factor y cantidad base. |

## Recursos

| Recurso | Estado | Endpoint / Ubicacion | Brechas principales |
| --- | --- | --- | --- |
| Empresas | Cumple | `GET /api/integrations/mch/companies`; modulo interno `Tenants` | NIT obligatorio en altas/ediciones, razon social, estado y fechas UTC. |
| Sucursales | Cumple | `GET /api/integrations/mch/branches` | Expone `MainBrandId` y marca principal seleccionable desde el maestro. |
| Clientes | Parcial | `GET /api/integrations/mch/customers` | Basico disponible; falta historizacion de propietario de vehiculo. |
| Proveedores | Cumple | `GET /api/integrations/mch/suppliers`; modulo interno `Suppliers` | Incluye identificacion, contacto, clasificacion OFICIAL/TERCERO y marca representada cuando corresponde. |
| Catalogo de articulos | Cumple | `GET /api/integrations/mch/article-catalog`; modulo interno `Products` | Incluye jerarquia cerrada de categorias, origen original/homologo/generico, marca, fabricante, catalogo oficial, estado, aplicabilidad por modelo con fuente, equivalencias, sustituciones dirigidas con vigencia, referencias simples/kits y composicion, unidades/conversiones, dimensiones, tiempos y parametros de reposicion. |
| Unidades de medida | Cumple | `GET /api/integrations/mch/units`; maestro interno de articulos | Lista cerrada por empresa con codigo, nombre, simbolo, fraccionamiento y estado. |
| Inventario | Cumple | `GET /api/integrations/mch/inventory`; `GET /api/integrations/mch/inventory-movements`; modulo `Inventory` | La sucursal actua como bodega; expone unidad base, ubicaciones y saldos, costo, min/max y kardex con unidad, conversion, documento y usuario. |
| Ventas | Cumple | `GET /api/integrations/mch/sales`; POS e historial de ventas | Cada linea preserva referencia, marca, cantidad/unidad, precio, descuento, impuestos, total, costo y clasificacion. Las devoluciones y notas credito son documentos trazables contra la factura original; controlan cantidades parciales y distinguen si reintegran inventario. Los costos anteriores a la migracion del punto 7 permanecen en cero porque no existe una fuente historica confiable para reconstruirlos. |
| Compras | Cumple | `GET /api/integrations/mch/purchases`; entradas de mercancia | Expone factura y fecha del proveedor, recepcion efectiva, bodega/ubicacion, pedido y fecha asociados, proveedor oficial/tercero y marca representada. Cada linea conserva marca, cantidad decimal, unidad exacta, cantidad base, costo unitario y total. |
| Ordenes de taller | Cumple | `GET /api/integrations/mch/service-orders`; modulo interno `ServiceOrders` | El expediente unificado conserva ingreso, evidencias, firma, problema reportado, diagnostico tecnico, aprobacion del cliente, responsable y fecha del diagnostico, trabajos, consumos, cierre y factura. Los repuestos descuentan inventario mediante `CONSUMO_TALLER` al confirmarse y solo se convierten en lineas de venta al facturar, evitando doble salida. La API MCH expone numero visible, empresa/NIT historicos, sucursal, marca/vehiculo, cliente, fechas, tipo/origen, diagnostico, historial, anulacion, factura, totales y lineas con pagador, impacto, servicio, revision, tecnico y tiempos. |
| Vehiculos UIO | Cumple | `GET /api/integrations/mch/vehicles`; modulo interno `Vehicles` | Maestro por VIN unico de 17 caracteres, marca/modelo formal, motor, placa, fecha de venta, propietario vigente e historial, kilometraje, sucursal, historial por chasis y revisiones atendidas. |
| Ordenes de alistamiento | Cumple | `GET /api/integrations/mch/preparation-orders`; modulo interno `PreparationOrders` | Implementa solicitud comercial, vehiculo por chasis, empresa/sucursal/marca, fechas, ejecutante, consumos y hallazgos. Al completar, los consumos con articulo descuentan inventario y generan movimiento documental. |
| Garantias fabricante | Cumple | `GET /api/integrations/mch/warranties`; modulo interno `Warranties` | Reclamacion por vehiculo y orden origen, tipo, deteccion, causa, falla, pieza causante, reemplazos, mano de obra, estado de marca con historia, autorizacion, radicacion, resultado, valoracion, factura que agrupa garantias y pago. Los registros previos quedan marcados `IsLegacyRecord`. |
| Marcas | Cumple | `GET /api/integrations/mch/brands`; modulo interno `VehicleCatalogs` | Catalogo cerrado por empresa, con codigo, nombre, estado y relaciones explicitas. |
| Personal | Cumple | `GET /api/integrations/mch/personnel`; usuarios, tecnicos y jefes de taller | Identificador estable por origen, empresa, sucursal, nombre, cargo/especialidad, contacto, estado y fechas UTC. |
| Modelos | Cumple | `GET /api/integrations/mch/models`; modulo interno `VehicleCatalogs` | Catalogo cerrado dependiente de marca y empresa. |

## Checklist Para Cada Cambio

Antes de cerrar cualquier cambio relevante:

1. Revisar si toca ventas, compras, inventario, productos, taller, garantias, sucursales, tenants, usuarios o reportes.
2. Si toca alguno, revisar esta matriz y el DOCX fuente.
3. Actualizar estados o brechas si el cambio mejora o afecta MCH.
4. Ejecutar `dotnet build TPV.sln -v:m`.
5. Si toca frontend, ejecutar `npm run build` en `TPV.Frontend`.
6. No subir secretos ni credenciales de integracion.
