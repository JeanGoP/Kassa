SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

DECLARE @AdminEmail NVARCHAR(256) = 'admin@tpv.com';
DECLARE @AdminId NVARCHAR(450);

-- 1) Localizar el usuario administrador
SELECT @AdminId = Id
FROM AspNetUsers
WHERE NormalizedEmail = UPPER(@AdminEmail);

IF @AdminId IS NULL
BEGIN
    RAISERROR('No se encontró el usuario administrador con email %s.', 16, 1, @AdminEmail);
    ROLLBACK TRANSACTION;
    RETURN;
END;

PRINT 'Id del usuario administrador: ' + @AdminId;

------------------------------------------------------------
-- 2) DESHABILITAR TODAS LAS CLAVES FORÁNEAS
------------------------------------------------------------
DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql = @sql + 
    N'ALTER TABLE [' + OBJECT_SCHEMA_NAME(parent_object_id) + 
    N'].[' + OBJECT_NAME(parent_object_id) + 
    N'] NOCHECK CONSTRAINT [' + name + N'];' + CHAR(13)
FROM sys.foreign_keys
WHERE is_ms_shipped = 0;

PRINT 'Deshabilitando claves foráneas...';
PRINT @sql;

EXEC sp_executesql @sql;

------------------------------------------------------------
-- 3) BORRAR DATOS DE TABLAS DE DOMINIO (NO IDENTITY)
------------------------------------------------------------
SET @sql = N'';

SELECT @sql = @sql + 
    N'DELETE FROM [' + s.name + N'].[' + t.name + N'];' + CHAR(13)
FROM sys.tables t
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE t.name NOT LIKE 'AspNet%'              -- excluir tab. Identity
  AND t.name <> '__EFMigrationsHistory';     -- conservar migraciones

PRINT 'Eliminando datos de tablas de dominio...';
PRINT @sql;

EXEC sp_executesql @sql;

------------------------------------------------------------
-- 4) LIMPIAR IDENTITY PARA USUARIOS QUE NO SON EL ADMIN
------------------------------------------------------------

-- Tokens de usuarios no admin
DELETE FROM AspNetUserTokens
WHERE UserId <> @AdminId;

-- Logins externos de usuarios no admin
DELETE FROM AspNetUserLogins
WHERE UserId <> @AdminId;

-- Claims de usuarios no admin
DELETE FROM AspNetUserClaims
WHERE UserId <> @AdminId;

-- Roles asignados a usuarios no admin
DELETE FROM AspNetUserRoles
WHERE UserId <> @AdminId;

-- Usuarios no admin
DELETE FROM AspNetUsers
WHERE Id <> @AdminId;

------------------------------------------------------------
-- 5) REHABILITAR TODAS LAS CLAVES FORÁNEAS
------------------------------------------------------------
SET @sql = N'';

SELECT @sql = @sql + 
    N'ALTER TABLE [' + OBJECT_SCHEMA_NAME(parent_object_id) + 
    N'].[' + OBJECT_NAME(parent_object_id) + 
    N'] WITH CHECK CHECK CONSTRAINT [' + name + N'];' + CHAR(13)
FROM sys.foreign_keys
WHERE is_ms_shipped = 0;

PRINT 'Rehabilitando claves foráneas...';
PRINT @sql;

EXEC sp_executesql @sql;

COMMIT TRANSACTION;

PRINT 'Base de datos reseteada. Solo queda el usuario administrador.';


-- Reiniciar IDENTITY de todas tus tablas de negocio e identity que usan IDENTITY
DBCC CHECKIDENT ('dbo.Branches', RESEED, 0);
DBCC CHECKIDENT ('dbo.Categories', RESEED, 0);
DBCC CHECKIDENT ('dbo.AspNetRoleClaims', RESEED, 0);
DBCC CHECKIDENT ('dbo.AspNetUserClaims', RESEED, 0);
DBCC CHECKIDENT ('dbo.Sales', RESEED, 0);
DBCC CHECKIDENT ('dbo.Products', RESEED, 0);
DBCC CHECKIDENT ('dbo.SaleDetails', RESEED, 0);
DBCC CHECKIDENT ('dbo.Stocks', RESEED, 0);
DBCC CHECKIDENT ('dbo.CashSessions', RESEED, 0);
DBCC CHECKIDENT ('dbo.Suppliers', RESEED, 0);
DBCC CHECKIDENT ('dbo.Purchases', RESEED, 0);
DBCC CHECKIDENT ('dbo.PurchaseDetails', RESEED, 0);
DBCC CHECKIDENT ('dbo.Customers', RESEED, 0);
DBCC CHECKIDENT ('dbo.ServiceOrders', RESEED, 0);
DBCC CHECKIDENT ('dbo.ServiceOrderWorks', RESEED, 0);
DBCC CHECKIDENT ('dbo.Technicians', RESEED, 0);
DBCC CHECKIDENT ('dbo.ServiceOrderParts', RESEED, 0);