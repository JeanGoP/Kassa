SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

BEGIN TRANSACTION;

DECLARE @AdminEmail NVARCHAR(256) = 'admin@tpv.com';
DECLARE @AdminId NVARCHAR(450);

-- 1) Localizar el usuario administrador
SELECT @AdminId = Id
FROM AspNetUsers
WHERE NormalizedEmail = UPPER(@AdminEmail);

IF @AdminId IS NULL
BEGIN
    PRINT 'No se encontró el usuario administrador con email ' + @AdminEmail + '. Se procederá a borrar todos los usuarios.';
END
ELSE
BEGIN
    PRINT 'Id del usuario administrador: ' + @AdminId;
END

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
EXEC sp_executesql @sql;

------------------------------------------------------------
-- 3) BORRAR DATOS DE TABLAS DE DOMINIO (NO IDENTITY)
------------------------------------------------------------
SET @sql = N'';

-- Generar DELETE para todas las tablas que NO sean de Identity ni de Migraciones
SELECT @sql = @sql + 
    N'DELETE FROM [' + s.name + N'].[' + t.name + N'];' + CHAR(13)
FROM sys.tables t
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE t.name NOT LIKE 'AspNet%'              -- excluir tab. Identity
  AND t.name <> '__EFMigrationsHistory';     -- conservar migraciones

PRINT 'Eliminando datos de tablas de dominio...';
EXEC sp_executesql @sql;

------------------------------------------------------------
-- 4) LIMPIAR IDENTITY
------------------------------------------------------------

-- A) Renombrar rol Ventas a Vendedor si existe (para migración)
IF EXISTS (SELECT 1 FROM AspNetRoles WHERE Name = 'Vendedor')
BEGIN
    -- Vendedor ya existe, borramos Ventas si existe para evitar duplicados
    DELETE FROM AspNetRoles WHERE Name = 'Ventas';
END
ELSE
BEGIN
    -- Renombrar Ventas a Vendedor
    UPDATE AspNetRoles
    SET Name = 'Vendedor', NormalizedName = 'VENDEDOR'
    WHERE Name = 'Ventas';
END

-- B) Borrar roles que no sean los de sistema (Admin, Vendedor, Supervisor)
-- Se elimina "Host" ya que se ha unificado en Admin
DELETE FROM AspNetRoles
WHERE Name NOT IN ('Admin', 'Vendedor', 'Supervisor');

PRINT 'Roles no esenciales eliminados.';

IF @AdminId IS NOT NULL
BEGIN
    -- Asegurar que el admin no apunte a datos borrados (Tenant, Branch, etc.)
    UPDATE AspNetUsers
    SET TenantId = NULL, CurrentBranchId = NULL
    WHERE Id = @AdminId;

    -- Preservar solo al admin
    
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
    
    PRINT 'Usuarios eliminados (excepto admin).';
END
ELSE
BEGIN
    -- Borrar todo si no hay admin
    DELETE FROM AspNetUserTokens;
    DELETE FROM AspNetUserLogins;
    DELETE FROM AspNetUserClaims;
    DELETE FROM AspNetUserRoles;
    DELETE FROM AspNetUsers;
    DELETE FROM AspNetRoles; -- Borrar roles tambien si no hay admin (se recrearan)
    PRINT 'Todos los usuarios y roles eliminados.';
END

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
EXEC sp_executesql @sql;

COMMIT TRANSACTION;

PRINT 'Limpieza completada. La base de datos ha quedado vacía excepto por el usuario administrador y los roles base.';
