# Contexto Del Proyecto Kassa

## Proposito

Kassa es un sistema TPV/POS orientado a negocios con venta de productos, manejo de inventario por sucursal y operacion de taller de motos. El producto combina punto de venta, compras, caja, reportes, cotizaciones, agenda publica de citas, ordenes de servicio, garantias y administracion de usuarios.

## Arquitectura Actual

- Backend: ASP.NET Core / .NET 9 en `TPV.Web`.
- Capas: `TPV.Domain`, `TPV.Application`, `TPV.Infrastructure`, `TPV.Web`.
- Frontend: React 19, TypeScript, Vite, React Router, Axios, Recharts y SweetAlert2 en `TPV.Frontend`.
- Persistencia: SQL Server con Entity Framework Core e Identity.
- Autenticacion: cookie de ASP.NET Identity con `withCredentials` desde el frontend.
- Multiempresa: entidades con `IMustHaveTenant` se filtran por `tenant_id` del usuario autenticado.

## Modulos Funcionales

- Dashboard y reportes.
- POS, historial de ventas y emision de factura electronica.
- Caja: apertura, estado y cierre.
- Inventario: stock por sucursal, alertas, ajustes y traslados.
- Compras: entrada de mercancia, costos promedio ponderados y fletes.
- Productos, categorias, clientes, proveedores y sucursales.
- Taller: ordenes de servicio, alistamientos, ingreso de vehiculo, diagnostico, trabajos, repuestos, cierre y tablero.
- Citas: agenda interna y reserva publica por slug.
- Catalogo de servicios de moto.
- Garantias.
- Administracion: tenants, usuarios, roles y permisos.

## Reglas De Negocio Importantes

- Un usuario opera contra una sucursal asignada mediante `CurrentBranchId`.
- Ventas y compras validan que el usuario pertenezca a la sucursal objetivo.
- El stock vive en `Stock`, no en `Product`.
- El precio puede calcularse desde costo de stock mas rentabilidad del producto.
- Las entidades multiempresa deben implementar `IMustHaveTenant` para quedar bajo filtro global.
- Las reservas publicas se exponen por `AppointmentsController` y servicios publicos de moto; el resto de APIs internas debe requerir autenticacion.

## Riesgos Abiertos

- La especificacion MCH Posventa v6 es una referencia obligatoria para cambios funcionales. Revisar `Documentation/MCH_COMPLIANCE_MATRIX.md` y `Documentation/specs/Especificacion_API_Posventa_MCH_v6.docx` antes de tocar modulos relacionados.
- Agregar transacciones alrededor de ventas, compras, traslados y cierres de orden para evitar stock o caja inconsistente ante errores parciales.
- Afinar autorizacion por politica en controladores internos, no solo `[Authorize]`.
- Reducir advertencias de nulabilidad del backend.
- Resolver errores de lint del frontend, especialmente `any`, dependencias de hooks y `setState` en efectos.
- Dividir el bundle del frontend con lazy loading por rutas.
- Agregar pruebas automatizadas para ventas, compras, stock, multiempresa y reservas publicas.

## Estado Verificado En Oficina

- `dotnet build TPV.sln -v:m`: compila con advertencias, sin errores.
- `npm install` en `TPV.Frontend`: instala dependencias.
- `npm run build` en `TPV.Frontend`: compila.
- `npm run lint` en `TPV.Frontend`: falla por deuda de calidad existente.
