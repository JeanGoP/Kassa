# Operacion API MCH Posventa v1

## Contrato

- Base canonica: `https://<host>/api/integrations/mch/v1`.
- Protocolo: HTTPS con JSON UTF-8.
- Autenticacion: encabezado `X-MCH-API-Key` en todas las solicitudes.
- Modo: solo lectura. Todos los recursos son `GET`.
- Version vigente: `1.0`, informada en `X-MCH-API-Version`.
- Zona horaria contractual: UTC, informada en `X-MCH-Time-Zone`. Los campos `*At`, `*Utc`, `createdAt` y `modifiedAt` son fechas ISO 8601.
- Contrato de campos y tipos: `GET /contract`. Esta respuesta enumera cada endpoint, su DTO y todos los campos publicos, incluidos los tipos de los objetos anidados.
- Estado tecnico: `GET /health`.

La ruta historica `/api/integrations/mch` permanece disponible durante la transicion y devuelve `Deprecation: true` y el enlace a `/v1`.

## Endpoints

| Recurso | Ruta GET | Esquema de elemento |
| --- | --- | --- |
| Estado | `/status` | Metadatos de version y recursos |
| Salud | `/health` | Estado de API, base de datos, ambiente y mantenimiento |
| Contrato | `/contract` | Endpoints, campos, tipos y nulabilidad |
| Cobertura | `/coverage` | Cobertura funcional MCH |
| Empresas | `/companies` | `MchCompanyDto` |
| Sucursales | `/branches` | `MchBranchDto` |
| Marcas | `/brands` | `MchBrandDto` |
| Modelos | `/models` | `MchVehicleModelDto` |
| Clientes | `/customers` | `MchThirdPartyDto` |
| Proveedores | `/suppliers` | `MchThirdPartyDto` |
| Personal | `/personnel` | `MchPersonnelDto` |
| Articulos | `/article-catalog` | `MchArticleDto` |
| Unidades | `/units` | `MchUnitDto` |
| Inventario | `/inventory` | `MchInventoryDto` |
| Movimientos | `/inventory-movements` | `MchInventoryMovementDto` |
| Ventas | `/sales` | `MchSaleDto` |
| Compras | `/purchases` | `MchPurchaseDto` |
| Taller | `/service-orders` | `MchServiceOrderDto` |
| Vehiculos | `/vehicles` | `MchVehicleDto` |
| Garantias | `/warranties` | `MchWarrantyDto` |
| Alistamientos | `/preparation-orders` | `MchPreparationOrderDto` |

Los recursos paginados aceptan `empresaId`, `sucursalId`, `marca`, `desde`, `hasta`, `modificadoDesde`, `pageSize` y `continuationToken` cuando el filtro aplica al hecho. `pageSize` admite de 1 a 500 y usa 100 por defecto. La respuesta contiene `data`, `totalRecords`, `pageSize`, `nextContinuationToken` y `generatedAtUtc`.

Los identificadores son estables y no se reutilizan. En personal, el prefijo identifica el maestro de origen: `USER`, `TECHNICIAN` o `WORKSHOP_MANAGER`.

## Configuracion

No se almacenan claves reales en Git. Produccion y pruebas deben usar variables de entorno o un almacen de secretos:

```text
Integrations__MCH__Enabled=true
Integrations__MCH__ApiKeys__0=<clave-vigente>
Integrations__MCH__ApiKeys__1=<clave-en-rotacion>
Integrations__MCH__AllowedTenantIds__0=<empresa-autorizada>
Integrations__MCH__RequestsPerMinute=120
Integrations__MCH__Environment=production
Integrations__MCH__MaintenanceWindow=Domingos 02:00-04:00 America/Bogota
```

`AllowedTenantIds` resuelve el aislamiento en el servidor. Agregar una razon social consiste en validar su NIT y alcance contractual, incorporar su ID a esta lista y reiniciar la instancia; no cambia endpoints ni respuestas.

## Rotacion Y Revocacion

1. Generar una clave aleatoria de al menos 32 bytes y guardarla exclusivamente en el almacen de secretos.
2. Agregarla como segunda entrada de `ApiKeys`, publicar la configuracion y comprobar `/health` y una consulta paginada con la nueva clave.
3. Entregarla por el canal seguro acordado; nunca por Git, logs o correo abierto.
4. Tras confirmacion de MCH, retirar la clave anterior y volver a publicar la configuracion.
5. Para revocacion inmediata, retirar la clave comprometida. Si era la unica, agregar primero la sustituta para evitar interrupcion.

`ApiKey` singular se conserva solo para compatibilidad. Las nuevas instalaciones deben usar `ApiKeys`.

## Limites Y Disponibilidad

- Limite predeterminado: 120 solicitudes por minuto y credencial. Es configurable con `RequestsPerMinute`.
- Al excederlo se responde `429` con `Retry-After: 60`; MCH debe reintentar con espera exponencial.
- Disponibilidad objetivo mensual: 99.5%, excluyendo mantenimiento anunciado.
- Ventana ordinaria: domingos de 02:00 a 04:00, hora `America/Bogota`.
- Mantenimiento ordinario se notifica con 72 horas de anticipacion. Una emergencia se comunica tan pronto sea identificada.
- Durante indisponibilidad se responde `503` cuando la aplicacion puede atender; MCH conserva la ultima sincronizacion valida y reintenta desde su ultimo `modificadoDesde`.
- `401` indica clave ausente/revocada; `503` con mensaje de configuracion indica integracion o alcance deshabilitado.

## Versionamiento Y Cambios

La version mayor vive en la ruta (`/v1`). Adiciones compatibles, como campos opcionales, conservan la version mayor. Cambios que eliminen, renombren o cambien tipo/semantica crean `/v2` y mantienen convivencia por al menos 90 dias. MCH recibe aviso de cambios incompatibles con minimo 10 dias habiles de anticipacion, incluyendo contrato nuevo, fecha de activacion y retiro de la version anterior.

## Ambiente De Pruebas

El backend publicado puede desplegarse como ambiente independiente con `Environment=sandbox`, base de datos separada, claves distintas y un `AllowedTenantIds` exclusivo. Antes de habilitar produccion debe contener, como minimo, dos sucursales y datos representativos de empresas, personal, terceros, vehiculos, articulos, ubicaciones, movimientos, ventas, compras, ordenes de taller, garantias y alistamientos. No se copian datos personales productivos; los identificadores, NIT, VIN, placas, correos y telefonos deben ser sinteticos.

La aceptacion previa a produccion verifica: aislamiento sin filtros, paginacion completa, reanudacion con `modificadoDesde`, estados anulados, cantidades decimales/unidades, fechas UTC, limite `429`, rotacion de clave y recuperacion despues de `503`.
