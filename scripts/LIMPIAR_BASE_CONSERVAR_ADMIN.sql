/*
    Kassa - Limpieza total de datos conservando el administrador

    Motor: Microsoft SQL Server

    IMPORTANTE:
    1. Haga una copia de seguridad antes de ejecutar este script.
    2. Cierre el backend y cualquier proceso que escriba en la base.
    3. Verifique @AdminEmail.
    4. La primera ejecucion es solo una vista previa.
    5. Cambie @Execute a 1 unicamente cuando confirme la base seleccionada.

    Se conserva:
    - La estructura y el historial de migraciones de Entity Framework.
    - El usuario administrador indicado, incluida su contrasena.
    - Los roles y permisos del sistema necesarios para operar la aplicacion.

    Se elimina:
    - Toda la informacion funcional: empresas, sucursales, productos,
      inventario, clientes, proveedores, ventas, compras, taller, etc.
    - Todos los usuarios distintos del administrador.
    - Tokens, sesiones, logins externos y claims directos de usuarios.

    Este borrado destruye historicos requeridos por MCH. Utilicelo solo para
    una inicializacion intencional y autorizada, nunca como anulacion normal.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @AdminEmail nvarchar(256) = N'admin@tpv.com';
DECLARE @Execute bit = 0; -- Cambiar a 1 para ejecutar el borrado.
DECLARE @AdminId nvarchar(450);
DECLARE @AdminRoleId nvarchar(450);
DECLARE @DatabaseName sysname = DB_NAME();
DECLARE @Sql nvarchar(max) = N'';

SELECT @AdminId = Id
FROM dbo.AspNetUsers
WHERE NormalizedEmail = UPPER(@AdminEmail);

SELECT @AdminRoleId = Id
FROM dbo.AspNetRoles
WHERE NormalizedName = N'ADMIN';

IF @AdminId IS NULL
    THROW 50001, 'No se encontro el usuario administrador. No se borro ningun dato.', 1;

IF @AdminRoleId IS NULL
    THROW 50002, 'No se encontro el rol Admin. No se borro ningun dato.', 1;

PRINT N'Base seleccionada: ' + QUOTENAME(@DatabaseName);
PRINT N'Administrador que se conservara: ' + @AdminEmail;

IF @Execute = 0
BEGIN
    PRINT N'VISTA PREVIA: no se realizo ningun cambio.';
    PRINT N'Para confirmar, cambie DECLARE @Execute bit = 0 por 1 y ejecute nuevamente.';

    SELECT
        s.name AS [Esquema],
        t.name AS [Tabla],
        SUM(p.rows) AS [FilasAEliminar]
    FROM sys.tables AS t
    INNER JOIN sys.schemas AS s ON s.schema_id = t.schema_id
    INNER JOIN sys.partitions AS p
        ON p.object_id = t.object_id
       AND p.index_id IN (0, 1)
    WHERE t.is_ms_shipped = 0
      AND t.name NOT LIKE N'AspNet%'
      AND t.name <> N'__EFMigrationsHistory'
    GROUP BY s.name, t.name
    ORDER BY s.name, t.name;

    SELECT
        Email,
        CASE WHEN Id = @AdminId THEN N'SE CONSERVA' ELSE N'SE ELIMINA' END AS [Resultado]
    FROM dbo.AspNetUsers
    ORDER BY Email;

    RETURN;
END;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @LockResult int;
    EXEC @LockResult = sys.sp_getapplock
        @Resource = N'Kassa.ResetDatabaseKeepAdmin',
        @LockMode = N'Exclusive',
        @LockOwner = N'Transaction',
        @LockTimeout = 10000;

    IF @LockResult < 0
        THROW 50003, 'No fue posible obtener el bloqueo exclusivo para la limpieza.', 1;

    CREATE TABLE #EnabledForeignKeys
    (
        SchemaName sysname NOT NULL,
        TableName sysname NOT NULL,
        ConstraintName sysname NOT NULL
    );

    INSERT INTO #EnabledForeignKeys (SchemaName, TableName, ConstraintName)
    SELECT
        OBJECT_SCHEMA_NAME(fk.parent_object_id),
        OBJECT_NAME(fk.parent_object_id),
        fk.name
    FROM sys.foreign_keys AS fk
    WHERE fk.is_ms_shipped = 0
      AND fk.is_disabled = 0;

    CREATE TABLE #EnabledTriggers
    (
        SchemaName sysname NOT NULL,
        TableName sysname NOT NULL,
        TriggerName sysname NOT NULL
    );

    INSERT INTO #EnabledTriggers (SchemaName, TableName, TriggerName)
    SELECT
        OBJECT_SCHEMA_NAME(tr.parent_id),
        OBJECT_NAME(tr.parent_id),
        tr.name
    FROM sys.triggers AS tr
    WHERE tr.parent_class = 1
      AND tr.is_ms_shipped = 0
      AND tr.is_disabled = 0;

    SET @Sql = N'';
    SELECT @Sql = @Sql
        + N'DISABLE TRIGGER ' + QUOTENAME(TriggerName)
        + N' ON ' + QUOTENAME(SchemaName) + N'.' + QUOTENAME(TableName) + N';'
        + CHAR(13) + CHAR(10)
    FROM #EnabledTriggers
    ORDER BY SchemaName, TableName, TriggerName;
    EXEC sys.sp_executesql @Sql;

    SET @Sql = N'';
    SELECT @Sql = @Sql
        + N'ALTER TABLE ' + QUOTENAME(SchemaName) + N'.' + QUOTENAME(TableName)
        + N' NOCHECK CONSTRAINT ' + QUOTENAME(ConstraintName) + N';'
        + CHAR(13) + CHAR(10)
    FROM #EnabledForeignKeys
    ORDER BY SchemaName, TableName, ConstraintName;
    EXEC sys.sp_executesql @Sql;

    -- El administrador queda como usuario host, sin referencias a datos borrados.
    UPDATE dbo.AspNetUsers
    SET TenantId = NULL,
        CurrentBranchId = NULL,
        IsActive = 1,
        EmailConfirmed = 1,
        AccessFailedCount = 0,
        LockoutEnd = NULL,
        SecurityStamp = CONVERT(nvarchar(36), NEWID()),
        ConcurrencyStamp = CONVERT(nvarchar(36), NEWID()),
        UpdatedAt = SYSUTCDATETIME()
    WHERE Id = @AdminId;

    -- Vaciar todas las tablas funcionales presentes ahora o agregadas en el futuro.
    SET @Sql = N'';
    SELECT @Sql = @Sql
        + N'DELETE FROM ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) + N';'
        + CHAR(13) + CHAR(10)
    FROM sys.tables AS t
    INNER JOIN sys.schemas AS s ON s.schema_id = t.schema_id
    WHERE t.is_ms_shipped = 0
      AND t.name NOT LIKE N'AspNet%'
      AND t.name <> N'__EFMigrationsHistory'
    ORDER BY t.object_id;
    EXEC sys.sp_executesql @Sql;

    -- Limpiar identidad y reconstruir solamente la asignacion Admin.
    DELETE FROM dbo.AspNetUserTokens;
    DELETE FROM dbo.AspNetUserLogins;
    DELETE FROM dbo.AspNetUserClaims;
    DELETE FROM dbo.AspNetUserRoles;
    DELETE FROM dbo.AspNetUsers WHERE Id <> @AdminId;

    INSERT INTO dbo.AspNetUserRoles (UserId, RoleId)
    VALUES (@AdminId, @AdminRoleId);

    -- Reiniciar consecutivos de las tablas funcionales vacias.
    SET @Sql = N'';
    SELECT @Sql = @Sql
        + N'DBCC CHECKIDENT (N'''
        + REPLACE(QUOTENAME(s.name) + N'.' + QUOTENAME(t.name), N'''', N'''''')
        + N''', RESEED, '
        + CONVERT(nvarchar(50),
            CONVERT(decimal(38, 0), ic.seed_value)
            - CONVERT(decimal(38, 0), ic.increment_value))
        + N') WITH NO_INFOMSGS;'
        + CHAR(13) + CHAR(10)
    FROM sys.identity_columns AS ic
    INNER JOIN sys.tables AS t ON t.object_id = ic.object_id
    INNER JOIN sys.schemas AS s ON s.schema_id = t.schema_id
    WHERE t.is_ms_shipped = 0
      AND t.name NOT LIKE N'AspNet%'
      AND t.name <> N'__EFMigrationsHistory'
    ORDER BY t.object_id;
    EXEC sys.sp_executesql @Sql;

    SET @Sql = N'';
    SELECT @Sql = @Sql
        + N'ALTER TABLE ' + QUOTENAME(SchemaName) + N'.' + QUOTENAME(TableName)
        + N' WITH CHECK CHECK CONSTRAINT ' + QUOTENAME(ConstraintName) + N';'
        + CHAR(13) + CHAR(10)
    FROM #EnabledForeignKeys
    ORDER BY SchemaName, TableName, ConstraintName;
    EXEC sys.sp_executesql @Sql;

    SET @Sql = N'';
    SELECT @Sql = @Sql
        + N'ENABLE TRIGGER ' + QUOTENAME(TriggerName)
        + N' ON ' + QUOTENAME(SchemaName) + N'.' + QUOTENAME(TableName) + N';'
        + CHAR(13) + CHAR(10)
    FROM #EnabledTriggers
    ORDER BY SchemaName, TableName, TriggerName;
    EXEC sys.sp_executesql @Sql;

    IF (SELECT COUNT(*) FROM dbo.AspNetUsers) <> 1
        THROW 50004, 'La validacion final de usuarios fallo.', 1;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.AspNetUserRoles
        WHERE UserId = @AdminId
          AND RoleId = @AdminRoleId
    )
        THROW 50005, 'La validacion final del rol administrador fallo.', 1;

    COMMIT TRANSACTION;

    PRINT N'Limpieza completada correctamente en ' + QUOTENAME(@DatabaseName) + N'.';
    PRINT N'Usuario conservado: ' + @AdminEmail + N'.';
    PRINT N'La contrasena existente del administrador no fue modificada.';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    PRINT N'No se completo la limpieza. La transaccion fue revertida.';
    THROW;
END CATCH;
