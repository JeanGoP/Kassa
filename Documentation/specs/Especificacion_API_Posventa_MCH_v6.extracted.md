# Especificacion API Posventa MCH v6 - contenido extraido

> Archivo generado para auditoria tecnica. La autoridad sigue siendo el DOCX versionado.

ESPECIFICACIÓN DE INTEGRACIÓN

Datos de posventa requeridos por MotoCentro Honda S.A.

API de solo lectura · Versión 6.0 · Agosto 2026

Documento preparado por el área de Posventa de MotoCentro Honda S.A. para el proveedor de desarrollo, con el fin de especificar qué información debe exponer el sistema de gestión de taller para su consumo por parte de los sistemas analíticos de MCH.

## 1. Alcance y principios

MotoCentro Honda S.A. requiere acceso de lectura a los datos operativos de posventa generados por el sistema, para sus sucursales y para las razones sociales relacionadas que se le autoricen. La integración es unidireccional: el sistema expone, MCH consume. No se requiere que el sistema reciba, procese ni almacene información proveniente de MCH.

El listado que sigue es deliberadamente amplio. Se solicita al proveedor marcar cada campo como disponible hoy, disponible con desarrollo adicional, o no disponible, con el fin de acordar alcance y cronograma sobre una base común.

Principios de la integración:

Datos crudos, no calculados. Se requieren los hechos registrados en la operación (qué se hizo, a qué vehículo, cuándo, con qué repuestos). No se requieren indicadores, agregados ni cálculos derivados.

Cantidad y unidad son inseparables. Toda cantidad debe venir acompañada de la unidad en que está expresada, en el registro mismo y no únicamente en el maestro del artículo. Una misma referencia se compra, se almacena y se consume en unidades distintas: sin la unidad del registro, la cantidad no es interpretable.

Aislamiento por credencial. El servidor aloja información de varias empresas. La credencial entregada a MCH debe poder acceder únicamente a datos de MotoCentro Honda S.A., por diseño del sistema y no por el filtro que envíe el cliente. Ninguna consulta, con o sin filtros, debe poder devolver información de otra empresa.

Empresa como dimensión de consulta. El alcance autorizado puede comprender más de una razón social. Todo registro debe indicar a qué empresa (NIT) pertenece, y todo recurso debe poder filtrarse por empresa. La empresa de un registro es la vigente en el momento en que ocurrió el hecho: si un punto de venta cambia de razón social, los registros anteriores conservan la empresa que tenían.

Marca como dimensión independiente. La marca (Honda, Bajaj u otra) NO depende de la empresa ni del punto de venta: es un atributo del hecho mismo. Un punto de venta atiende principalmente una marca pero puede atender otra ocasionalmente, y una misma marca puede pasar de una razón social a otra. Todo registro debe traer la marca que le corresponde por su contenido (la del vehículo o el artículo), no la del punto donde se registró.

Sucursal como dimensión operativa. Todo registro debe indicar a qué sucursal corresponde y todo recurso debe ser filtrable por ella.

Consulta incremental. Todo recurso debe permitir traer únicamente los registros creados o modificados después de una fecha/hora dada, para no reconsultar el histórico completo.

Trazabilidad. Cada registro debe exponer un identificador estable y sus marcas de tiempo de creación y última modificación.

## 2. Requisitos transversales

## 3. Recursos requeridos

### 3.1 Orden de taller — encabezado

Un registro por orden de trabajo.

### 3.2 Orden de taller — líneas de detalle

Un registro por línea de la orden. Es el nivel de detalle más importante de esta especificación: sin el desglose línea por línea no es posible analizar la operación.

### 3.3 Vehículos (UIO)

Universo de vehículos atendidos. Requerido para análisis de retención y de historial.

### 3.4 Órdenes de alistamiento

Preparación del vehículo previa a su entrega al cliente. El flujo esperado es que el área comercial SOLICITE el alistamiento y el área de posventa lo EJECUTE, dejando una orden con su propia trazabilidad.

### 3.5 Garantías

Reclamaciones de garantía atendidas, cuando el sistema las gestione.

Regla del negocio — el ciclo de la garantía no termina en el taller:

Para el distribuidor, una garantía se cierra cuando el FABRICANTE LA PAGA, no cuando el vehículo se repara. Los repuestos y la mano de obra los aporta el distribuidor por adelantado: mientras la reclamación no se pague, ese dinero está expuesto. Esto aplica a TODAS las marcas por igual, aunque el proceso y los estados de cada fabricante sean distintos. Por eso se requiere el ciclo completo con fechas —apertura, autorización, ejecución, radicación, facturación, respuesta y pago— y no únicamente el estado final.

### 3.6 Inventario

Requerido para planeación de abastecimiento.

### 3.7 Catálogo de artículos

Regla del negocio — la cantidad no se interpreta, se declara:

Una misma referencia puede comprarse, almacenarse, venderse y consumirse en unidades distintas: un lubricante se adquiere en caja de doce cuartos y se despacha por cuarto; otro se recibe en tambor y se sirve por mililitro; la mayoría de los repuestos se mueve siempre por unidad. Por eso una única unidad de medida en el maestro del artículo no es suficiente: se requieren la unidad base, las unidades de compra y de venta con su equivalencia, y la unidad de cada registro. Con esos datos toda cantidad expuesta por el sistema es interpretable sin necesidad de suponer.

### 3.8 Ventas

Facturación de posventa, tanto de taller como de mostrador.

### 3.9 Compras

### 3.10 Maestros de apoyo

## 4. Entregables solicitados

Documentación de los endpoints, con los campos de cada recurso y sus tipos.

Ambiente de pruebas con datos representativos, previo al ambiente productivo.

Credenciales de servicio de solo lectura, restringidas a los datos de MotoCentro Honda S.A.

Confirmación del mecanismo de aislamiento entre clientes alojados en el mismo sistema, y del procedimiento para ampliar el alcance a una nueva razón social.

Listado devuelto con cada campo marcado como disponible, disponible con desarrollo, o no disponible.

Definición de límites de uso, si los hubiera, y de la política de versionamiento de la API.

Procedimiento para revocar y rotar la credencial a solicitud de MCH.

Notificación previa ante cambios que alteren la estructura de las respuestas.

## 5. Observaciones

Esta especificación describe la información requerida, no la forma en que el sistema debe almacenarla internamente. El proveedor conserva plena libertad sobre su modelo de datos y su arquitectura, siempre que la información listada pueda ser expuesta con la granularidad indicada.

Se solicita revisar el listado e indicar qué campos están disponibles hoy, cuáles requieren desarrollo adicional y cuáles no es posible proveer, con el fin de acordar un alcance y un cronograma.

## Tabla 1

| Requisito | Detalle |
| --- | --- |
| Protocolo | API REST sobre HTTPS, respuestas en JSON. |
| Autenticación | Credencial de servicio para MCH, de solo lectura y restringida a los datos de MotoCentro Honda S.A. |
| Aislamiento | El alcance de la credencial se resuelve en el servidor. Una consulta sin filtro debe devolver únicamente las empresas autorizadas a esa credencial, nunca las de otros clientes alojados en el mismo sistema. |
| Alcance ampliable | Debe poder agregarse una nueva razón social al alcance de la credencial sin cambios en la estructura de las respuestas ni en los endpoints. |
| Revocación y rotación | La credencial debe poder revocarse y rotarse a solicitud de MCH, con el procedimiento documentado y sin interrumpir el servicio más allá del cambio. |
| Disponibilidad | Se requiere conocer la ventana de mantenimiento y el comportamiento esperado ante indisponibilidad, para que MCH pueda operar con la última información sincronizada. |
| Filtros mínimos | empresa, marca, sucursal, rango de fechas y modificado_desde. |
| Paginación | Obligatoria, con tamaño de página configurable e indicador de continuación. |
| Identificadores | Estables en el tiempo. Un registro no debe cambiar de identificador. |
| Marcas de tiempo | creado_en y modificado_en en todos los recursos, con zona horaria. |
| Anulaciones | Los registros anulados o eliminados deben seguir siendo consultables con su estado, no desaparecer. |
| Valores monetarios | Con indicación explícita de si incluyen o no IVA, y el porcentaje aplicado. |
| Dimensiones en todo registro | Todo recurso debe traer empresa, marca y sucursal, sin excepción. |
| Cantidades | Numéricas y con decimales. Un tipo entero no representa un consumo fraccionado —por ejemplo, 0,8 litros de lubricante— y produce redondeos silenciosos que no son detectables después. |
| Unidades de medida | Valores de lista cerrada, nunca texto libre. Toda cantidad expuesta —en órdenes de taller, alistamientos, garantías, ventas, compras e inventario— debe indicar la unidad en que está expresada. |

## Tabla 2

| Campo | Descripción |
| --- | --- |
| id / número | Identificador y número visible de la orden. |
| empresa | NIT y razón social vigentes al momento de la orden. |
| sucursal | Sucursal donde se atendió la orden. |
| marca | Marca del vehículo atendido. Puede diferir de la marca principal del punto. |
| fechas | Ingreso, entrega prometida y entrega real, con hora. |
| tipo de orden | Clase de trabajo de la ORDEN COMPLETA, como valor de lista cerrada: garantía, revisión de garantía, revisión de mantenimiento programado, reparación, retorno u otra que el sistema maneje. Es distinto del tipo de cada línea: una orden de un tipo puede contener líneas de tipos diversos. Sin este campo no es posible separar la operación por clase de trabajo. |
| estado | Estado actual de la orden y fecha de cada cambio de estado. |
| cliente | Identificación, nombre, teléfono y correo. |
| vehículo | Referencia al vehículo atendido (ver 3.3). |
| kilometraje | Kilometraje registrado al ingreso. |
| asesor / técnico | Quién recibe y quién ejecuta, identificados y con su sucursal. |
| totales | Total facturado al cliente, con desglose entre mano de obra, repuestos e insumos. |
| factura | Número y fecha de la factura asociada, si existe. |
| origen | Si la orden fue creada en taller, por garantía o por otro canal. |
| anulación | Si la orden fue anulada, con fecha y motivo. |

## Tabla 3

| Campo | Descripción |
| --- | --- |
| tipo de línea | Si la línea es mano de obra, repuesto o insumo. |
| descripción | Descripción de la actividad ejecutada o del artículo. |
| referencia | Código del repuesto o insumo, cuando aplique. |
| cantidad | Cantidad ejecutada o consumida en la línea, expresada en la unidad indicada en el campo siguiente. Numérica, con decimales. |
| unidad | Unidad en que está expresada la cantidad de ESTA línea (unidad, litro, mililitro, hora u otra). Puede diferir de la unidad habitual de la referencia: el mismo artículo se despacha suelto en un caso y por empaque completo en otro. |
| cantidad en unidad base | La misma cantidad convertida a la unidad base del artículo (ver 3.7), cuando el sistema la calcule. Si no la calcula, es preferible el campo vacío a un valor supuesto. |
| valor unitario | Valor unitario de la línea. |
| descuento | Descuento aplicado a la línea, en valor. |
| valor total | Total de la línea. |
| quién paga | Si la línea la paga el cliente, la fábrica (garantía o plan de mantenimiento) o si es asumida internamente. Campo indispensable. |
| suma al total | Si la línea suma o no al valor facturado al cliente. |
| tipo de servicio | Si corresponde a mantenimiento preventivo, correctivo, garantía o retrabajo. |
| revisión asociada | Cuando la línea corresponde a un mantenimiento programado, el kilometraje de la revisión que se está atendiendo. |
| técnico | Quién ejecutó esa línea, cuando difiere del técnico de la orden. |
| tiempo | Tiempo estimado y tiempo real de ejecución, cuando se registre. |

## Tabla 4

| Campo | Descripción |
| --- | --- |
| chasis (VIN) | Número de chasis completo, 17 posiciones. Es la llave del vehículo. |
| motor | Número de motor. |
| placa | Placa del vehículo. |
| marca / modelo | Marca y modelo, tal como esté registrado. |
| año modelo | Año modelo del vehículo. |
| fecha de venta | Fecha de facturación de la venta del vehículo, cuando se conozca. |
| propietario | Identificación del propietario actual y fecha desde la que lo es. |
| historial de servicio | Por chasis: todas las órdenes registradas, con fecha, kilometraje, sucursal y las revisiones de mantenimiento programado atendidas en cada una. Requisito prioritario: es la base del control de mantenimientos y de los indicadores de retención. |
| revisiones atendidas | Listado explícito de qué revisiones de mantenimiento programado registra el sistema para ese chasis, con la fecha y la orden en que se atendió cada una. |
| marca | Marca del vehículo, como atributo del vehículo y no del punto. |

## Tabla 5

| Campo | Descripción |
| --- | --- |
| identificación | Número de la orden de alistamiento y su estado. |
| origen de la solicitud | Documento o referencia del área comercial que originó la solicitud (venta, pedido o equivalente). Permite cerrar el círculo entre lo vendido y lo alistado. |
| vehículo | Chasis del vehículo a alistar. |
| empresa / sucursal / marca | Dónde se ejecuta. |
| fechas | Fecha y hora de la solicitud, y de la entrega efectiva. El tiempo entre ambas es un indicador de servicio. |
| ejecutante | Quién realizó el alistamiento. |
| consumos | Repuestos, lubricantes o insumos consumidos, cuando los haya, con referencia, cantidad, unidad y valor. |
| hallazgos | Novedades detectadas durante el alistamiento, incluida la apertura de una garantía (ver 3.5). |

## Tabla 6

| Campo | Descripción |
| --- | --- |
| identificación | Número de la garantía y orden de taller o de alistamiento asociada. |
| tipo de garantía | Distinguir la garantía CORRECTIVA (falla surgida durante el uso del vehículo) de la garantía DE CERO KILÓMETROS: defecto existente ANTES de que el cliente usara el vehículo, detectado antes de entregarlo. |
| momento de detección | En qué inspección se detectó: RECIBO del vehículo o ALISTAMIENTO. Un defecto que pasa el recibo y aparece en el alistamiento señala un problema distinto al que se detecta desde el ingreso. |
| causa atribuida | Ensamble, transporte, manipulación en bodega u otra. OPCIONAL: registrar solo cuando efectivamente se determine — es preferible el campo vacío a una causa supuesta. |
| vehículo | Chasis, kilometraje y fecha de la falla. |
| falla | Descripción de la falla y modo de falla, si el sistema lo clasifica. |
| pieza causante | Referencia y descripción de la pieza que ORIGINÓ la falla. Es distinta de las piezas reemplazadas: la causante puede no haberse reemplazado, y una sola causa puede obligar a cambiar varias piezas. Requerido para análisis de calidad por modelo y por lote. |
| piezas reemplazadas | Referencias efectivamente cambiadas, con cantidad, unidad y valor. |
| mano de obra | Tiempo reconocido y valor. |
| estado y su historia | Estado de la reclamación ante el fabricante Y LA FECHA DE CADA TRANSICIÓN, con quién la registró. Cada fabricante maneja su propio ciclo: se requiere el estado tal como lo define esa marca, no un estado genérico unificado. |
| autorización | Número y fecha de la autorización del fabricante, cuando el proceso de esa marca la exija antes de ejecutar. |
| radicación | Fecha en que la reclamación se radicó ante el fabricante. |
| resultado | Valor aprobado y valor rechazado, con el MOTIVO del rechazo cuando lo haya. El motivo es indispensable: sin él no es posible corregir y volver a presentar. |
| valoración | Valor reconocido por el fabricante, que es DISTINTO del que se le cobraría al cliente por el mismo trabajo. La tarifa de mano de obra en garantía se liquida por el tiempo reconocido del fabricante. |
| factura al fabricante | Número y fecha de la factura con la que la garantía se cobró al fabricante, y qué garantías cubre esa factura. |
| pago | Si la factura fue pagada por el fabricante y en qué fecha, o si sigue pendiente en el estado de cuenta. |
| kilometraje de la falla | Kilómetros del vehículo al momento de la falla. Distingue un defecto temprano de un desgaste esperable. |
| lote / fecha de fabricación | Lote o fecha de ensamble del vehículo o de la pieza, cuando el sistema lo registre. Permite identificar problemas concentrados en un lote y no en el modelo completo. |

## Tabla 7

| Campo | Descripción |
| --- | --- |
| referencia | Código del artículo. |
| descripción | Descripción del artículo. |
| existencia | Existencia actual por sucursal y por bodega, indicando la unidad en que está expresada. Una existencia sin unidad no es comparable con el consumo. |
| costo | Costo unitario actual, indicando a qué unidad corresponde. |
| precio | Precio de venta vigente. |
| ubicación | Bodega o ubicación física, cuando aplique. |
| estado | Si el artículo está activo, descontinuado o bloqueado. |
| movimientos | Entradas y salidas con fecha, tipo de movimiento, cantidad, unidad y documento asociado. |

## Tabla 8

| Campo | Descripción |
| --- | --- |
| referencia | Código del artículo. |
| descripción | Descripción del artículo, en texto. |
| categoría | Clasificación del artículo como valor de lista cerrada, NO texto libre. Si el sistema maneja jerarquía (línea / grupo / subgrupo, o familia / categoría), se requieren todos los niveles: sin ella no es posible diferenciar políticas de reposición entre un filtro de alta rotación y una pieza de baja rotación. |
| tipo de artículo | Si es ORIGINAL de la marca, HOMÓLOGO de otro fabricante, o GENÉRICO. Es un atributo del artículo y no cambia según a quién se le compre. Lista cerrada. |
| marca del artículo | Marca a la que pertenece la referencia cuando es original (Honda, Bajaj u otra). |
| en lista oficial | Si la referencia figura en el listado oficial vigente del distribuidor de esa marca. Es distinto de ser original: una pieza puede ser original y haber salido del catálogo vigente. |
| fabricante | Fabricante del artículo. |
| aplicabilidad | Modelos de vehículo a los que aplica la referencia. Una misma referencia suele servir a varios modelos. Se requiere la relación completa referencia → modelos, tal como la declare el catálogo oficial de la marca. |
| referencias intercambiables | Referencias distintas que corresponden a la MISMA pieza y conviven vigentes (por cambio de empaque, de proveedor u otra razón). Cualquiera de ellas sirve. |
| referencias sustitutas | Cuando una referencia REEMPLAZA a otra que salió de línea. Es una relación con dirección y con fecha de vigencia: la referencia anterior ya no se pide, pero puede quedar existencia de ella. |
| origen de la equivalencia | Si la relación de aplicabilidad o equivalencia la declara el CATÁLOGO OFICIAL de la marca o proviene de otra fuente. Es determinante: una equivalencia no declarada por la marca puede no ser reconocida en un servicio de garantía. |
| estado | Si el artículo está activo, descontinuado o bloqueado. |
| unidad base | Unidad BASE del artículo: aquella en la que el sistema descuenta el inventario (unidad, mililitro, litro, gramo u otra). Es la unidad de referencia a la que se convierte todo lo demás. Valor de lista cerrada. |
| admite fraccionamiento | Si el artículo puede consumirse en fracciones de su unidad base. Un filtro no se fracciona; un lubricante servido a granel sí. |
| unidad de compra | Unidad en que el artículo se adquiere al proveedor (caja, tambor, unidad) y CUÁNTAS unidades base contiene. Ejemplo: una caja de doce cuartos equivale a doce unidades base. |
| unidad de venta o consumo | Unidad en que el artículo se despacha al cliente o se consume en taller, con su equivalencia en unidades base. Puede diferir de la de compra: un artículo se compra por caja y se vende por unidad. |
| múltiplo de pedido | Cantidad mínima y múltiplo en que el proveedor despacha el artículo, cuando exista. Un artículo que solo se pide por caja no puede solicitarse en cantidades sueltas. |
| tipo de referencia | Si la referencia corresponde a un artículo SIMPLE o a un KIT que agrupa varias piezas bajo un solo código. Valor de lista cerrada. |
| composición del kit | Cuando la referencia es un kit: las referencias que lo componen, con la cantidad y la unidad de cada una. Sin la composición, el consumo de las piezas contenidas en un kit queda invisible, y una misma pieza despachada suelta un día y dentro de un kit al día siguiente se contabiliza de dos formas distintas. No se requiere que el sistema descomponga el consumo: basta con exponer la composición y el consumo tal como se registró. |
| peso y dimensiones | Peso y volumen del artículo, cuando se registren. Determinan el costo de flete a las sucursales. |
| tiempo de reposición | Días que tarda el artículo en llegar desde el proveedor, cuando el sistema lo registre. |
| parámetros | Punto de reorden, mínimo y máximo, cuando estén configurados. |

## Tabla 9

| Campo | Descripción |
| --- | --- |
| documento | Tipo, número y fecha del documento. |
| empresa / sucursal / marca | Empresa vigente al momento del documento, sucursal, y marca de los artículos. |
| cliente | Identificación y nombre del cliente. |
| líneas | Referencia, descripción, cantidad, unidad, valor unitario, descuento, valor total y costo de cada línea. |
| clasificación | Cuenta contable o clasificación que distinga taller, repuestos, lubricantes y accesorios. |
| orden asociada | Orden de taller asociada al documento, cuando exista. |
| anulaciones | Notas crédito y devoluciones, referenciando el documento original. |

## Tabla 10

| Campo | Descripción |
| --- | --- |
| documento | Tipo, número y fecha del documento de compra. |
| proveedor | Identificación y nombre del proveedor, y si corresponde al distribuidor oficial de la marca (Fanalca, UMA) o a un tercero. Una pieza original puede comprarse a un tercero: el tipo de artículo y el tipo de proveedor son ejes independientes. |
| líneas | Referencia, cantidad, unidad, costo unitario y costo total. El costo unitario debe corresponder a la unidad indicada en la línea: si la compra se registra por caja, el costo es el de la caja, no el del contenido. |
| recepción | Fecha de recepción efectiva en bodega. |
| empresa / sucursal | Empresa y sucursal de destino. |
| pedido | Pedido u orden de compra asociada, y su fecha, para medir tiempos de reposición. |

## Tabla 11

| Recurso | Contenido |
| --- | --- |
| Empresas | NIT, razón social y estado de cada razón social dentro del alcance autorizado. |
| Sucursales | Identificador, nombre, ciudad, empresa a la que pertenece y marca principal de cada sucursal. |
| Marcas | Listado de marcas manejadas por el sistema. |
| Personal | Identificador, nombre, cargo, sucursal y estado (activo / inactivo). |
| Terceros | Clientes y proveedores con identificación, nombre y datos de contacto. |
| Modelos | Catálogo de marcas y modelos de vehículo manejados por el sistema. |
