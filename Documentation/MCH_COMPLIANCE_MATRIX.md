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
- Vehiculo maestro por VIN/chasis no existe.
- Ordenes de alistamiento no existen como recurso propio.
- Garantias no tienen ciclo completo contra fabricante.
- Unidades de medida son texto libre y no hay conversiones compra/base/venta.
- Cantidades de algunas entidades siguen siendo enteras donde MCH exige decimales.
- Anulaciones/historial de estados no estan completas.
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
| MCH-T07 | Filtros empresa, marca, sucursal, fechas, modificado_desde | Parcial | `MchQuery` tiene todos los parametros, pero `Marca` solo aplica claramente en ordenes de servicio. |
| MCH-T08 | Paginacion obligatoria | Cumple | `PageSize`, `ContinuationToken`, `NextContinuationToken`. |
| MCH-T09 | Identificadores estables | Parcial | Usa IDs internos estables; falta documentar politica de estabilidad. |
| MCH-T10 | creado_en y modificado_en con zona horaria | Parcial | Expone `CreatedAt`/`ModifiedAt`, pero sin zona horaria explicita. |
| MCH-T11 | Anulaciones/eliminados siguen consultables | Parcial | `IsActive` se mapea a estado, pero no todos los flujos preservan anulaciones con fecha/motivo. |
| MCH-T12 | Valores monetarios indican IVA | Parcial | Ventas/compras exponen impuestos en lineas; no todos los recursos indican si incluyen IVA. |
| MCH-T13 | Todo recurso trae empresa, marca y sucursal | Parcial | Empresa/sucursal existen en varios recursos. Marca falta en ventas/compras/inventario/catalogo como dimension formal. |
| MCH-T14 | Cantidades numericas decimales | Parcial | Entidades como compras/ventas/partes usan cantidades que parecen enteras en varios puntos. |
| MCH-T15 | Unidades cerradas y por registro | Parcial | Se expone `UnitOfMeasure` desde producto, pero no hay lista cerrada ni unidad propia por cada movimiento/linea. |

## Recursos

| Recurso | Estado | Endpoint / Ubicacion | Brechas principales |
| --- | --- | --- | --- |
| Empresas | Parcial | `GET /api/integrations/mch/companies` | Falta confirmar NIT obligatorio y zona horaria en fechas. |
| Sucursales | Parcial | `GET /api/integrations/mch/branches` | `MainBrand` sale `null`; falta marca principal real. |
| Clientes | Parcial | `GET /api/integrations/mch/customers` | Basico disponible; falta historizacion de propietario de vehiculo. |
| Proveedores | Parcial | `GET /api/integrations/mch/suppliers` | Basico disponible; falta clasificar proveedor oficial vs tercero. |
| Catalogo de articulos | Parcial | `GET /api/integrations/mch/article-catalog` | Faltan marca, aplicabilidad, equivalencias, sustitutos, kits, unidades compra/venta/base y conversiones. |
| Inventario | Parcial | `GET /api/integrations/mch/inventory` | Existencia/costo/precio disponible; faltan bodegas reales, ubicaciones, movimientos y unidad del registro. |
| Ventas | Parcial | `GET /api/integrations/mch/sales` | Encabezado y lineas basicas; faltan marca, clasificacion contable, anulaciones/notas credito, costo por linea. |
| Compras | Parcial | `GET /api/integrations/mch/purchases` | Encabezado y lineas basicas; falta recepcion real, pedido asociado, marca y unidad estricta de compra. |
| Ordenes de taller | Parcial | `GET /api/integrations/mch/service-orders` | Encabezado, trabajos y repuestos basicos; faltan VIN/chasis, tipo de orden, historia de estados, quien paga, suma al total, revision asociada y tiempos reales. |
| Vehiculos UIO | No cumple | Sin endpoint dedicado | Falta maestro por chasis/VIN, motor, propietario, historial por chasis y revisiones atendidas. |
| Ordenes de alistamiento | No cumple | Sin entidad/endpoint dedicado | Falta flujo comercial -> posventa con trazabilidad propia. |
| Garantias fabricante | No cumple | Entidad `Warranty` basica | Falta ciclo completo: deteccion, causa, pieza causante, autorizacion, radicacion, respuesta, facturacion y pago fabricante. |
| Marcas | No cumple | Sin endpoint dedicado | Falta catalogo formal de marcas y relacion por hechos/articulos/vehiculos. |
| Personal | Parcial | No expuesto por MCH actualmente | Existen usuarios/tecnicos/encargados, pero falta endpoint consolidado para personal. |
| Modelos | No cumple | Sin endpoint dedicado | Falta catalogo formal marca/modelo. |

## Checklist Para Cada Cambio

Antes de cerrar cualquier cambio relevante:

1. Revisar si toca ventas, compras, inventario, productos, taller, garantias, sucursales, tenants, usuarios o reportes.
2. Si toca alguno, revisar esta matriz y el DOCX fuente.
3. Actualizar estados o brechas si el cambio mejora o afecta MCH.
4. Ejecutar `dotnet build TPV.sln -v:m`.
5. Si toca frontend, ejecutar `npm run build` en `TPV.Frontend`.
6. No subir secretos ni credenciales de integracion.

