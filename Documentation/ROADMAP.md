# Roadmap Tecnico

## Prioridad Alta

- Cerrar todas las APIs internas con autenticacion.
- Rotar la clave de SQL Server que estuvo versionada.
- Mover secretos a variables de entorno o Secret Manager.
- Revisar permisos finos por modulo: ventas, compras, inventario, caja, reportes y administracion.
- Agregar transacciones en operaciones que modifican stock o caja.

## Prioridad Media

- Reducir advertencias de nulabilidad en backend.
- Corregir lint del frontend.
- Agregar pruebas de servicios para ventas, compras, stock, multiempresa y citas.
- Documentar despliegue de backend y frontend.

## Prioridad Baja

- Lazy loading por rutas en React para reducir el bundle inicial.
- Mejorar README funcional con capturas.
- Unificar idioma y mensajes de error.
