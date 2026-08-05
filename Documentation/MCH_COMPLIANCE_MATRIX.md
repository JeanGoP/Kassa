# Matriz De Cumplimiento MCH Posventa v6

Fuente normativa: `Documentation/specs/Especificacion_API_Posventa_MCH_v6.docx`.

Extraccion auxiliar: `Documentation/specs/Especificacion_API_Posventa_MCH_v6.extracted.md`.

Ultima revision: 2026-08-04.

Estados:

- Cumple: el sistema/API ya expone o soporta razonablemente el requisito.
- Parcial: existe una primera capa, pero faltan campos, reglas o documentacion.
- No cumple: no hay soporte actual claro en modelo o API.
- Requiere decision: depende de definicion operativa, despliegue o alcance acordado con MCH.

## Resumen Ejecutivo

La integracion MCH existente es una primera capa readonly util, pero aun no cumple totalmente la especificacion v6. Lo mas importante ya presente es: endpoint REST JSON, API key, paginacion, filtro por empresa/sucursal/fechas/modificado_desde en varios recursos, datos base de empresas, sucursales, terceros, catalogo, inventario, ventas, compras y ordenes de servicio.

Brechas principales:

- Marca no esta modelada como dimension independiente en todos los hechos.
- Vehiculo maestro por VIN/chasis y catalogos formales de marca/modelo implementados y relacionados.
- Garantias no tienen ciclo completo contra fabricante.
- Unidades de medida son texto libre y no hay conversiones compra/base/venta.
- Cantidades de algunas entidades siguen siendo enteras donde MCH exige decimales.
- Las ordenes de taller ya preservan anulacion e historia de estados; falta extender esta politica a los demas documentos operativos.
- Documentacion formal de endpoints, limites, rotacion y ambiente de pruebas esta pendiente.

## Requisitos Transversales

| ID | Requisito | Estado | Evidencia / Brecha |
| --- | --- | --- | --- |
| MCH-T01 | API REST sobre HTTPS, JSON | Parcial | Existe `api/integrations/mch` JSON. HTTPS depende de despliegue/proxy. |
| MCH-T02 | Credencial de servicio readonly para MCH | Parcial | Usa `X-MCH-API-Key`; todos los endpoints son `GET`. Falta procedimiento formal de rotacion. |
| MCH-T03 | Aislamiento por credencial en servidor | Cumple | `ValidateAccess` exige API key y ahora exige `AllowedTenantIds`; `ApplyTenantScope` siempre filtra por tenants autorizados. |
| MCH-T04 | Alcance ampliable a nuevas razones sociales | Cumple | `Integrations:MCH:AllowedTenantIds` permite varios tenants sin cambiar respuestas. |
| MCH-T05 | Revocacion y rotacion documentada | Parcial | Se puede rotar `Integrations:MCH:ApiKey`, pero falta runbook operativo. |
| MCH-T06 | Disponibilidad y ventana de mantenimiento | No cumple | No hay documento/SLA operativo. |
| MCH-T07 | Filtros empresa, marca, sucursal, fechas, modificado_desde | Cumple | `MchQuery` aplica los filtros transversales en los recursos correspondientes, incluida marca formal en sucursales, articulos, inventario, ventas, compras, vehiculos y ordenes. |
| MCH-T08 | Paginacion obligatoria | Cumple | `PageSize`, `ContinuationToken`, `NextContinuationToken`. |
| MCH-T09 | Identificadores estables | Parcial | Usa IDs internos estables; falta documentar politica de estabilidad. |
| MCH-T10 | creado_en y modificado_en con zona horaria | Parcial | Expone `CreatedAt`/`ModifiedAt`, pero sin zona horaria explicita. |
| MCH-T11 | Anulaciones/eliminados siguen consultables | Parcial | Las ordenes de taller anuladas conservan fecha, motivo, responsable e historial y siguen disponibles en MCH; falta completar el mismo patron en ventas, compras y otros documentos. |
| MCH-T12 | Valores monetarios indican IVA | Parcial | Ventas/compras exponen impuestos en lineas; no todos los recursos indican si incluyen IVA. |
| MCH-T13 | Todo recurso trae empresa, marca y sucursal | Cumple | Empresa y sucursal se exponen por hecho; la marca se toma del vehiculo o de cada articulo/linea y nunca se infiere desde la sucursal. |
| MCH-T14 | Cantidades numericas decimales | Parcial | Entidades como compras/ventas/partes usan cantidades que parecen enteras en varios puntos. |
| MCH-T15 | Unidades cerradas y por registro | Parcial | Se expone `UnitOfMeasure` desde producto, pero no hay lista cerrada ni unidad propia por cada movimiento/linea. |

## Recursos

| Recurso | Estado | Endpoint / Ubicacion | Brechas principales |
| --- | --- | --- | --- |
| Empresas | Parcial | `GET /api/integrations/mch/companies` | Falta confirmar NIT obligatorio y zona horaria en fechas. |
| Sucursales | Cumple | `GET /api/integrations/mch/branches` | Expone `MainBrandId` y marca principal seleccionable desde el maestro. |
| Clientes | Parcial | `GET /api/integrations/mch/customers` | Basico disponible; falta historizacion de propietario de vehiculo. |
| Proveedores | Parcial | `GET /api/integrations/mch/suppliers` | Basico disponible; falta clasificar proveedor oficial vs tercero. |
| Catalogo de articulos | Parcial | `GET /api/integrations/mch/article-catalog` | Ya incluye marca formal; faltan aplicabilidad, equivalencias, sustitutos, kits, unidades compra/venta/base y conversiones. |
| Inventario | Parcial | `GET /api/integrations/mch/inventory` | Ya expone marca del articulo, existencia, costo y precio; faltan bodegas reales, ubicaciones, movimientos y unidad del registro. |
| Ventas | Parcial | `GET /api/integrations/mch/sales` | Cada linea expone marca formal; faltan clasificacion contable, anulaciones/notas credito y costo por linea. |
| Compras | Parcial | `GET /api/integrations/mch/purchases` | Cada linea expone marca formal; falta recepcion real, pedido asociado y unidad estricta de compra. |
| Ordenes de taller | Cumple | `GET /api/integrations/mch/service-orders` | Expone numero visible, empresa/NIT historicos, sucursal, marca/vehiculo, cliente, recepcion, promesa y salida, tipo/origen, historial, anulacion, factura, totales y lineas con pagador, impacto, servicio, revision, tecnico y tiempos. La normalizacion decimal/unidades se atiende transversalmente en el punto 5. |
| Vehiculos UIO | Cumple | `GET /api/integrations/mch/vehicles`; modulo interno `Vehicles` | Maestro por VIN unico de 17 caracteres, marca/modelo formal, motor, placa, fecha de venta, propietario vigente e historial, kilometraje, sucursal, historial por chasis y revisiones atendidas. |
| Ordenes de alistamiento | Cumple | `GET /api/integrations/mch/preparation-orders`; modulo interno `PreparationOrders` | Implementa solicitud comercial, vehiculo por chasis, empresa/sucursal/marca, fechas, ejecutante, consumos y hallazgos. Pendiente definir si los consumos descuentan inventario automaticamente. |
| Garantias fabricante | No cumple | Entidad `Warranty` basica | Falta ciclo completo: deteccion, causa, pieza causante, autorizacion, radicacion, respuesta, facturacion y pago fabricante. |
| Marcas | Cumple | `GET /api/integrations/mch/brands`; modulo interno `VehicleCatalogs` | Catalogo cerrado por empresa, con codigo, nombre, estado y relaciones explicitas. |
| Personal | Parcial | No expuesto por MCH actualmente | Existen usuarios/tecnicos/encargados, pero falta endpoint consolidado para personal. |
| Modelos | Cumple | `GET /api/integrations/mch/models`; modulo interno `VehicleCatalogs` | Catalogo cerrado dependiente de marca y empresa. |

## Checklist Para Cada Cambio

Antes de cerrar cualquier cambio relevante:

1. Revisar si toca ventas, compras, inventario, productos, taller, garantias, sucursales, tenants, usuarios o reportes.
2. Si toca alguno, revisar esta matriz y el DOCX fuente.
3. Actualizar estados o brechas si el cambio mejora o afecta MCH.
4. Ejecutar `dotnet build TPV.sln -v:m`.
5. Si toca frontend, ejecutar `npm run build` en `TPV.Frontend`.
6. No subir secretos ni credenciales de integracion.
