# Setup Local

## Requisitos

- .NET SDK 9.
- Node.js compatible con Vite 6.
- SQL Server o LocalDB.
- Git.

## Configuracion De Secretos

No guardes credenciales reales en `appsettings.json`.

Para la cadena de conexion usa una variable de entorno:

```powershell
$env:ConnectionStrings__DefaultConnection="Server=TU_SERVIDOR;Database=TPV;User Id=TU_USUARIO;Password=TU_PASSWORD;TrustServerCertificate=True;MultipleActiveResultSets=true"
```

Para permitir que el seeder cree el usuario administrador inicial:

```powershell
$env:KASSA_SEED_ADMIN_PASSWORD="Cambia_Esta_Clave_123!"
```

Si la base ya tiene usuario administrador, esa variable no es necesaria para iniciar.

## Backend

Desde la raiz del repo:

```powershell
dotnet restore TPV.sln
dotnet build TPV.sln -v:m
dotnet run --project TPV.Web
```

El frontend espera por defecto la API en:

```text
http://localhost:5292/api
```

## Frontend

Desde `TPV.Frontend`:

```powershell
npm install
npm run dev
```

Para build de produccion:

```powershell
npm run build
```

Si necesitas apuntar el frontend a otra API:

```powershell
$env:VITE_API_URL="https://tu-api/api"
npm run build
```

## Flujo Casa / Oficina

Antes de cambiar de equipo:

```powershell
git status
git add .
git commit -m "Describe el cambio"
git push
```

Al llegar al otro equipo:

```powershell
git pull
dotnet build TPV.sln -v:m
cd TPV.Frontend
npm install
npm run build
```

## Seguridad Operativa

- Rota cualquier clave que haya estado versionada.
- Usa variables de entorno para conexion, APIs externas y contrasenas iniciales.
- No subas `appsettings.Production.json`, `.env` ni archivos locales con secretos.
