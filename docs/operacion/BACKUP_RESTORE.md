# P25: continuidad, respaldo y restauración

Estado documental: 03-10-2026. Este documento prepara una prueba futura; no acredita backups productivos, restauraciones ejecutadas, capacidad ni failover. Itecsa usa Aiven como apoyo **temporal de desarrollo** para disponer de una BD en línea; no ha elegido el alojamiento definitivo ni dispone aún de hosting para SPA/API. Itecsa decidió que, al desplegar, **todos los registros de la BD actual se eliminarán**: se conservará la estructura, no se migrarán esos datos. Esta decisión no ejecuta ni autoriza el borrado. Los controles y condiciones de proveedores se siguen en el [inventario P26](../security/data-processors.md).

## Alcance y dependencias para reconstruir el servicio

| Componente | Evidencia de repositorio | Recuperación aún por comprobar |
| --- | --- | --- |
| SPA y API | [Arquitectura](../arquitectura/ARQUITECTURA.md), [CI](../../.github/workflows/security-ci.yml) y código versionado | No hay hosting seleccionado; planificar artefactos, DNS, TLS, proxy, capacidad y rollback antes de publicar. |
| BD MySQL | [Esquema Prisma](../../capaServidor/prisma/schema.prisma), [conexión](../../capaServidor/src/database/prisma.js) y [procedimiento de migración](ORDERS_MIGRACION.md) | Reconstrucción de una BD vacía, cadena de migraciones y datos de catálogo necesarios para operar; para el destino definitivo, backup, retención, cifrado, redundancia y restauración. |
| Auth0 | [Configuración esperada](../auth0/README.md) y [servicio Management](../../capaServidor/src/modules/users/service/auth0Management.service.js) | Tenant, aplicaciones, conexiones, acciones, roles, plantillas y correo efectivos; exportación y reconstrucción. Itecsa confirmó una encargada técnica; registrar nombre y suplente. Aprobaciones contractuales quedan por asignar. |
| Configuración y secretos | [Plantillas sin valores](../../capaServidor/env.example) y [runbook de secretos](../security/SECRETOS.md) | Gestor efectivo, custodios, acceso de emergencia, certificados y rotación. Nunca copiar valores a este documento o a Git. |
| Servicios externos | [Resend condicionado](../security/H07-pin-recovery-delivery.md), Aiven temporal y hosting futuro aún no seleccionado | Cuenta y habilitación reales de lo que se use hoy; evaluar disponibilidad, región, contactos y salida de proveedores definitivos al elegirlos. |
| Otros datos persistentes | [Arquitectura](../arquitectura/ARQUITECTURA.md) describe datos estructurados y fixture local; módulo PDF/firma retirado | Confirmar en el despliegue si existen volúmenes, archivos, logs o cachés persistentes adicionales. |

## Objetivos y controles pendientes

**RPO** (pérdida máxima aceptable de datos) y **RTO** (tiempo máximo aceptable de indisponibilidad) están **pendientes de decisión de Itecsa** por proceso y componente. La dirección o dueño de pedidos/cobranzas debe confirmar el impacto de la pérdida e interrupción; operaciones y la encargada técnica de Auth0 deben evaluar viabilidad en sus respectivos sistemas. No se fijan cifras de ejemplo como compromisos.

| Control | Estado comprobable hoy | Evidencia necesaria antes de declararlo operativo |
| --- | --- | --- |
| Backup de BD, frecuencia y cobertura | No comprobados en la cuenta Aiven; un archivo local ignorado por Git, de origen no verificado, no demuestra un backup productivo. | Determinar primero si la BD temporal contiene datos reales o irremplazables. Si los contiene, definir protección proporcional y verificar copias. Para el destino definitivo, exigir evidencia de configuración y ejecución. |
| Retención, cifrado y acceso | No comprobados. | Política aprobada, configuración real, llaves/custodios y permisos; tratamiento de copias tras supresión. |
| Restauración y pruebas | Existe un [runbook breve](../security/INCIDENTES_Y_RESTAURACION.md), sin acta de prueba integral encontrada. | Copia identificada, ensayo aislado, integridad, tiempos medidos y acta fechada. |
| Redundancia, capacidad y failover | Despliegue/topología reales no constan en `dev`. | Arquitectura y límites efectivos; prueba sólo si el diseño y objetivos aprobados la requieren. |
| Reconstrucción de aplicación y Auth0 | Código y configuración esperada versionados. | Artefacto desplegado, configuración externa exportable, secretos recuperables y prueba funcional integral. |
| Registro y repetición | No se encontró registro de ejercicio integral. | Operadores, versión, fecha, pasos, resultados, incidencias, correcciones y próximo ejercicio. |

La Ley 21.719, art. 14 quinquies, trata disponibilidad, integridad, resiliencia, restauración y evaluación regular de medidas según riesgo. La NCh-ISO/IEC 27002:2022 incluida en el proyecto relaciona objetivos de continuidad con RPO/RTO (5.30) y recomienda mantener y probar respaldos según política (8.13). Estas fuentes no fijan valores empresariales para Itecsa.

## Dos horizontes de continuidad de la BD

1. **Mientras se usa Aiven para desarrollo:** los registros actuales no se conservarán al desplegar. Evitar agregar datos reales innecesarios y verificar si los datos presentes exigen medidas durante el período de desarrollo. No tratar esta instancia como origen de datos productivos ni como plan de continuidad definitivo.
2. **Antes del despliegue en el alojamiento definitivo:** crear una BD nueva y vacía a partir de una estructura validada; no copiar filas de Aiven. Comprobar migraciones, índices, relaciones y los catálogos mínimos que el código necesita. El [procedimiento de Orders](ORDERS_MIGRACION.md) exige, por ejemplo, estados iniciales de pedido y pago; no se encontró un seed versionado en las migraciones revisadas. Conservar sólo la estructura no demuestra que el servicio arranque funcionalmente. La reconciliación de la cadena histórica corresponde a P21 y debe resolverse antes de usarla como fuente de despliegue.
3. **Después de elegir el proveedor y operar con datos persistentes:** aprobar región y condiciones contractuales, definir RPO/RTO y probar backup/restauración del destino real. No trasladar al proveedor definitivo supuestos sobre Aiven.

El borrado futuro de Aiven debe tener procedimiento y autorización propios. Confirmar qué ocurre con backups, réplicas y logs del proveedor; borrar las filas visibles no demuestra su supresión en esas copias. Esta decisión se refiere a la BD actual, no a identidades o configuraciones de Auth0.

## Procedimiento propuesto para un ensayo futuro

Este procedimiento está destinado al entorno futuro que deba conservar datos; no es una restauración de los registros de desarrollo que Itecsa decidió descartar. Sólo podrá ejecutarse tras autorización específica del ensayo y elección de un backup cuyo origen, fecha y categorías de datos estén acreditados.

1. Registrar identificador y origen del backup, custodio, fecha, alcance y riesgos. Comprobar que su uso está permitido y que no restaura datos ya suprimidos sin reconciliación.
2. Preparar una red y una BD **aisladas y descartables**, con nombres, credenciales y permisos distintos de producción. Impedir conectividad de escritura hacia producción. Desactivar envío de correo e integraciones salientes; usar acceso mínimo y sólo los secretos imprescindibles.
3. Verificar que el destino está vacío y es el entorno autorizado. Una segunda persona confirma destino, identidad del operador y copia seleccionada antes de cualquier escritura.
4. Restaurar siguiendo el método validado para el proveedor y la versión concreta, sin sobreescribir origen ni backups. Conservar registros de operación sin datos personales ni credenciales.
5. Validar esquema, `_prisma_migrations`, relaciones, conteos de control, usuarios, pedidos, pagos y eventos; realizar pruebas funcionales sin correo real ni integraciones destructivas. Registrar discrepancias y tiempo medido.
6. Comparar pérdida y duración medidas con RPO/RTO **cuando Itecsa los haya aprobado**. Si falla la integridad, detener el ensayo y preservar evidencia; no promover la copia a producción.
7. Registrar resultado, incidencias y acciones. Destruir la BD y el entorno descartables, revocar credenciales temporales y confirmar la eliminación según el procedimiento autorizado.

Un retorno a producción o un failover necesita un plan y aprobación operativa separados. La restauración puede reintroducir datos sujetos a supresión o bloqueo ([P17/P18](../security/RETENCION_Y_DERECHOS.md)); un fallo o exposición puede requerir evaluación bajo el [runbook de incidentes](../security/INCIDENTES_Y_RESTAURACION.md). La divergencia de esquema/migraciones de [Orders](ORDERS_MIGRACION.md) debe comprobarse en el ensayo. Estas dependencias no se resuelven mediante este documento.

## Plantilla de acta de ejercicio

Completar únicamente después de un ensayo real. No adjuntar backup, datos personales, credenciales, capturas sensibles ni connection strings.

| Campo | Registro |
| --- | --- |
| Fecha, entorno aislado y operadores | Pendiente de ejercicio |
| Autorización y segundo control del destino | Pendiente de ejercicio |
| Backup: referencia, origen, fecha y categorías | Pendiente de ejercicio |
| Versión de aplicación, esquema y procedimiento | Pendiente de ejercicio |
| Aislamiento, correo/integraciones y acceso | Pendiente de ejercicio |
| Inicio, fin, pérdida estimada y tiempo medido | Pendiente de ejercicio |
| Validaciones de integridad y funcionalidad | Pendiente de ejercicio |
| Incidencias, decisiones y acciones correctivas | Pendiente de ejercicio |
| Limpieza del entorno y revocación de acceso | Pendiente de ejercicio |
| Revisión, aprobación y siguiente prueba | Pendiente de ejercicio |

P25 seguirá abierto hasta que existan objetivos aprobados, backups verificados, restauración integral exitosa y repetible, mediciones, responsables y actas. El documento por sí solo no cierra el hallazgo.
