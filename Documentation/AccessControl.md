# Documentación de Gestión de Usuarios y Control de Acceso por Sucursal

## Resumen de Cambios
Se ha implementado un sistema de control de acceso basado en la sucursal asignada a cada usuario. Esto asegura que los empleados solo puedan operar (vender, gestionar inventario) dentro de su sucursal asignada, mientras que ciertos roles privilegiados (Administradores, Supervisores) mantienen capacidades de supervisión y traslado entre sucursales.

## Funcionalidades Implementadas

### 1. Asignación de Sucursal
- **Creación de Usuario**: Al crear un usuario desde el panel de administración (`/users`), es **obligatorio** seleccionar una sucursal.
- **Persistencia**: La sucursal seleccionada se guarda en el campo `CurrentBranchId` de la entidad `ApplicationUser`.
- **Edición**: El administrador puede modificar la sucursal asignada en cualquier momento.

### 2. Restricciones de Operación

#### Ventas (`SalesService`)
- Al intentar crear una venta (`CreateSaleAsync`), el sistema valida que el usuario esté asignado a la sucursal donde se intenta registrar la venta.
- **Excepción**: No hay excepciones. Un vendedor solo vende en su sucursal.

#### Compras (`PurchaseService`)
- Al registrar una compra (`CreatePurchaseAsync`), se valida que el usuario pertenezca a la sucursal de destino.

#### Inventario (`StockService`)
- **Visualización**: `GetStockByBranchAsync` filtra el acceso. Si un usuario intenta ver el stock de una sucursal ajena, recibe un error de autorización.
- **Modificación**: `UpdateStockAsync` y `AdjustStockAsync` bloquean cambios en sucursales ajenas.
- **Alertas**: `GetLowStockAlertsAsync` solo muestra alertas de la sucursal del usuario.

### 3. Excepción para Traslados
- **Requisito**: Los traslados de inventario requieren acceso tanto a la bodega de origen como a la de destino (o al menos visibilidad global).
- **Implementación**: Se creó el permiso `HasPermissionToTransferAsync`.
- **Roles Autorizados**: Usuarios con rol **Admin** o **Supervisor**.
- **Comportamiento**:
  - Si el usuario es **Supervisor/Admin**, puede ver inventarios de cualquier sucursal y realizar traslados entre cualquiera de ellas.
  - Si el usuario es **Vendedor/Cajero**, solo puede ver su propio inventario y no tiene permiso para iniciar traslados hacia afuera (según configuración actual, restringido por `HasPermissionToTransferAsync`).

## Flujo Técnico

1. **Frontend (React)**:
   - Envía el `CurrentBranchId` al crear/editar usuario.
   - Las peticiones de venta/inventario incluyen implícitamente la identidad del usuario (Token JWT).

2. **Backend (.NET Core)**:
   - `InventoryController`, `SalesController`, `PurchasesController` extraen el `userId` del `ClaimTypes.NameIdentifier`.
   - Invocan a los servicios pasando este `userId`.
   - `UserService` actúa como punto central de validación (`IsUserInBranchAsync`).

## Guía de Pruebas

### Verificar Restricción de Venta
1. Loguearse como usuario asignado a "Sucursal A".
2. Intentar realizar una venta enviando `branchId` de "Sucursal B" (vía API o manipulando UI).
3. **Resultado Esperado**: Error 403 Forbidden / Unauthorized.

### Verificar Traslado
1. Loguearse como usuario con rol "Supervisor".
2. Ir a "Traslados".
3. Seleccionar Origen "Sucursal A" y Destino "Sucursal B".
4. **Resultado Esperado**: Operación exitosa, el stock se mueve correctamente.

### Verificar Visibilidad de Stock
1. Loguearse como usuario "Vendedor" de "Sucursal A".
2. Intentar acceder a la vista de inventario de "Sucursal B".
3. **Resultado Esperado**: Error de acceso o lista vacía (según manejo de UI), el backend rechaza la petición.
