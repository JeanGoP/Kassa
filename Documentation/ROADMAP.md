# Roadmap Tecnico

## Roadmap MCH Posventa v6

Este roadmap se ejecuta en orden. Un punto se marca como terminado cuando incluye modelo de datos, operacion interna, API MCH, migracion aplicada, builds y publicacion cuando corresponda.

1. **Terminado - Vehiculos UIO e historial por chasis.** Maestro unico por VIN de 17 caracteres, motor, placa, marca/modelo, propietario vigente e historial, fecha de venta, kilometraje, sucursal, atenciones de taller/alistamiento y revisiones programadas. Endpoint: `GET /api/integrations/mch/vehicles`.
2. **Pendiente - Catalogos formales de marcas y modelos.** Crear maestros cerrados y relacionarlos con vehiculos, sucursales, articulos y hechos operativos.
3. **Pendiente - Ordenes de taller completas.** Tipo y origen de orden, estados con historia, anulacion, pagador por linea, impacto en total, revision asociada y tiempos reales.
4. **Pendiente - Garantias de fabricante.** Ciclo desde deteccion hasta autorizacion, radicacion, respuesta, factura y pago del fabricante.
5. **Pendiente - Unidades e inventario.** Cantidades decimales, unidades cerradas por registro, conversiones, bodegas, ubicaciones y movimientos trazables.
6. **Pendiente - Catalogo avanzado de articulos.** Clasificacion cerrada, original/homologo/generico, fabricante, aplicabilidad, equivalencias, sustitutos, kits y reposicion.

Siguiente punto activo: **2. Catalogos formales de marcas y modelos**.

## Prioridad Alta

- Cerrar brechas de cumplimiento frente a `Documentation/MCH_COMPLIANCE_MATRIX.md`.
- Cerrar todas las APIs internas con autenticacion.
- Rotar la clave de SQL Server que estuvo versionada.
- Mover secretos a variables de entorno o Secret Manager.
- Revisar permisos finos por modulo: ventas, compras, inventario, caja, reportes y administracion.
- Agregar transacciones en operaciones que modifican stock o caja.
- Definir si los consumos de alistamiento deben descontar inventario automaticamente o solo quedar como trazabilidad; se resolvera dentro del punto 5.

## Prioridad Media

- Reducir advertencias de nulabilidad en backend.
- Corregir lint del frontend.
- Agregar pruebas de servicios para ventas, compras, stock, multiempresa y citas.
- Documentar despliegue de backend y frontend.

## Prioridad Baja

- Lazy loading por rutas en React para reducir el bundle inicial.
- Mejorar README funcional con capturas.
- Unificar idioma y mensajes de error.
