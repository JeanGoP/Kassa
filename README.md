# Kassa

Kassa es un sistema TPV/POS para comercio y taller de motos. Incluye ventas, caja, inventario por sucursal, compras, clientes, proveedores, cotizaciones, citas, ordenes de servicio, garantias, reportes, usuarios, roles, permisos y multiempresa.

## Estructura

- `TPV.Domain`: entidades y contratos base.
- `TPV.Application`: DTOs, interfaces y servicios de negocio.
- `TPV.Infrastructure`: Entity Framework, Identity, repositorios, multiempresa y persistencia.
- `TPV.Web`: API ASP.NET Core y vistas MVC legacy.
- `TPV.Frontend`: aplicacion React/Vite.
- `Documentation`: contexto funcional, setup local y roadmap.

## Arranque Rapido

Consulta [Documentation/LOCAL_SETUP.md](Documentation/LOCAL_SETUP.md) para correr backend, frontend y configurar secretos locales.

## Contexto Del Producto

Consulta [Documentation/PROJECT_CONTEXT.md](Documentation/PROJECT_CONTEXT.md) para entender los modulos construidos, reglas importantes y riesgos abiertos.
