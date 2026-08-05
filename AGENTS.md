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
- Para una limpieza total solicitada expresamente, usar unicamente `scripts/LIMPIAR_BASE_CONSERVAR_ADMIN.sql`. Los scripts antiguos `Borrar base de datos.sql` y `Borrar base de datos2.sql` no corresponden al modelo actual.
- Cuando se haga un cambio funcional de backend, publicar siempre con `dotnet publish TPV.Web\TPV.Web.csproj -c Release -o publish\backend` para dejar artefactos listos para copiar.
- Excepcion temporal para los nueve puntos de `Documentation/ROADMAP.md`: durante los puntos 3 al 8 solo compilar el backend, aplicar las migraciones reales y hacer commit/push. Regenerar `publish/backend` una sola vez al completar el punto 9. Esta excepcion no aplica a trabajos fuera de ese roadmap.
- Cuando se haga un cambio funcional de frontend, ejecutar `npm run build` en `TPV.Frontend` para dejar actualizado `TPV.Frontend/dist`.
- No iniciar servidores locales ni probar mediante URLs locales, salvo que el usuario lo solicite expresamente. La entrega normal es compilar, aplicar la migracion cuando exista y publicar directamente los artefactos.

## Mantenimiento Obligatorio Del Manual

- En cada cambio del sistema, revisar siempre el manual de usuario ubicado en `Documentation/Manual`.
- Si el cambio modifica una pantalla, campo, permiso, mensaje o procedimiento del usuario final, actualizar en el mismo trabajo las instrucciones paso a paso y las capturas afectadas.
- Mantener sincronizados `MANUAL_USUARIO_KASSA.md`, `Manual_Usuario_Kassa.docx` y `Manual_Usuario_Kassa.pdf`. Regenerar Word y PDF con `scripts/build_user_manual.py` despues de editar la fuente o las capturas.
- Cuando se agreguen o reemplacen capturas de produccion, ejecutar `scripts/sanitize_manual_screenshots.py` y verificar que no queden credenciales ni datos sensibles.
- Renderizar y revisar visualmente los documentos finales antes de entregar. El texto y las imagenes no deben quedar cortados, superpuestos ni desactualizados.
- Publicar los cambios del manual junto con el cambio funcional correspondiente. Un cambio visible para el usuario no se considera terminado sin esta revision.
- Si un cambio es exclusivamente interno y no afecta el uso del sistema, registrar en la entrega que el manual fue revisado y que no requirio actualizacion.
