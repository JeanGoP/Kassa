# Instrucciones Para Codex En Este Repo

## Regla MCH Posventa

Antes de hacer cambios funcionales, de API, modelo de datos, base de datos, taller, inventario, ventas, compras, garantias, citas o reportes, revisar:

- `Documentation/specs/Especificacion_API_Posventa_MCH_v6.docx`
- `Documentation/MCH_COMPLIANCE_MATRIX.md`

Cada cambio debe considerar si mejora, rompe o deja igual el cumplimiento frente a la especificacion MCH v6. Si el cambio afecta algun requisito, actualizar la matriz de cumplimiento en el mismo commit.

## Seguridad

- No versionar credenciales reales.
- No dejar conexiones productivas en `appsettings.json`.
- Mantener la integracion MCH con alcance explicito por tenant; `AllowedTenantIds` no puede estar vacio cuando la integracion este habilitada.

## Publicacion Y Base De Datos

- Cuando se agregue o modifique una migracion de Entity Framework, aplicar siempre la migracion en la base real configurada con `dotnet ef database update --project TPV.Infrastructure --startup-project TPV.Web --context ApplicationDbContext`.
- Cuando se haga un cambio funcional de backend, publicar siempre con `dotnet publish TPV.Web\TPV.Web.csproj -c Release -o publish\backend` para dejar artefactos listos para copiar.
- Cuando se haga un cambio funcional de frontend, ejecutar `npm run build` en `TPV.Frontend` para dejar actualizado `TPV.Frontend/dist`.
