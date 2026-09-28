# Informe de cambios PIN delegados

Fecha de corte original: 26-09-2026. Avance actualizado el 27-09-2026 en rama `opt-users`.

## Decisión y alcance

El rediseño criptográfico y de persistencia del PIN continúa asignado al otro equipo. Como primera medida de `USR-ACT-002`, esta rama sí retiró el adaptador que imprimía correo/código, unificó las decisiones de entorno en `APP_ENV` y dejó la recuperación fail-closed en todos los entornos hasta aprobar un proveedor. No se modificaron esquema Prisma, hashes, secretos, PIN ni datos reales.

Este documento explica por qué se había propuesto el rediseño, su efecto técnico y su relación con las leyes y normas citadas por el proyecto. No es una implementación, una opinión legal, una certificación ISO ni evidencia de que los controles operen en producción.

## Estado conservado y riesgos que motivan el cambio futuro

El diseño actual ya aporta controles útiles: PIN aleatorio de seis dígitos, sal individual, comparación en tiempo constante, hash scrypt, bloqueo luego de cinco intentos, cifrado AES-256-GCM de la copia pendiente, eliminación de esa copia al aceptarla y retos de recuperación con quince minutos de vigencia.

Quedan, sin embargo, estas brechas:

- scrypt usa `N=2^14, r=8, p=1`, menor que la opción mínima `N=2^17, r=8, p=1` recomendada actualmente por OWASP;
- los hashes no identifican su versión, por lo que un cambio de costo exige una migración abrupta o lógica implícita;
- el fingerprint HMAC global y único correlaciona PIN iguales entre usuarios y fuerza una restricción global innecesaria;
- la copia reversible del PIN inicial no expira mientras el usuario no la acepte;
- un único `PIN_SECRET` cifra pendientes y deriva fingerprints, sin versión que permita rotación gradual;
- lectura, incremento de intentos y consumo del reto no están serializados con bloqueo de fila, de modo que solicitudes concurrentes pueden perder incrementos o consumir el mismo estado observado;
- se pueden crear varios retos activos por usuario y no existe una cuota persistente compartida para recuperación;
- la entrega real sigue sin proveedor: el adaptador por defecto ahora responde indisponibilidad en todos los entornos y los tests inyectan un fake con datos sintéticos;
- los eventos PIN no quedan en la nueva auditoría de seguridad transaccional.

OWASP indica que scrypt debe usarse con una configuración mínima equivalente a `N=2^17, r=8, p=1` cuando Argon2id no está disponible. Esa recomendación es una buena práctica técnica y **no** un algoritmo ordenado por la legislación chilena: [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

## Cambios propuestos y efectos

| Cambio futuro | Por qué se propone | Impacto técnico y operativo |
|---|---|---|
| Hash versionado con scrypt `N=2^17, r=8, p=1`, `maxmem=256 MiB` y rehash tras una validación correcta | Aumentar el costo del ataque offline y permitir evolución gradual | Añade versión a usuarios y retos; eleva CPU/RAM por validación; exige pruebas de carga y límites contra DoS; los hashes antiguos siguen válidos hasta su actualización oportunista |
| Retirar `pin_fingerprint` y su unicidad global | Evitar correlación entre usuarios y el requisito artificial de que todos tengan PIN distinto | Requiere DDL supervisado; simplifica generación; no cambia la validación por hash individual |
| Caducidad de 24 horas para el PIN inicial reversible | Reducir el tiempo durante el cual existe material recuperable | Añade expiración y actualización condicional; al vencer se borran ciphertext/IV/tag y se regenera atómicamente; cambia la experiencia de usuarios que demoraron la aceptación |
| Claves `PIN_ACTIVE_SECRET_VERSION` y `PIN_SECRET_V<n>` | Rotar cifrado sin perder de inmediato pendientes creados con una clave anterior | Añade versión por fila y un período de doble lectura; obliga a inventariar pendientes antes de retirar claves; el secreto nunca debe guardarse en Git |
| Bloqueo transaccional de fila para validar, recuperar y aceptar | Evitar carreras en intentos, regeneración y consumo | Requiere transacciones MySQL reales, orden de bloqueos estable y pruebas concurrentes; puede aumentar espera bajo abuso |
| Un reto activo por usuario, consumo compare-and-set, cinco intentos y quince minutos | Hacer inequívoco el reto vigente y garantizar un solo uso | Invalida retos previos al emitir uno nuevo; respuestas concurrentes sólo permiten un ganador; requiere índice y limpieza posterior |
| Cuotas persistentes: 3 por usuario y 10 por IP cada hora | Frenar enumeración y fuerza bruta de recuperación en despliegues con varias instancias | Reutiliza `SecurityThrottle`, responde 429 con `Retry-After` y necesita política sobre proxy/IP; almacena identificadores seudonimizados por un plazo corto |
| Entrega fail-closed en todos los entornos y proveedor falso en tests — **implementado** | Impedir que códigos o correos aparezcan en consola y evitar una falsa entrega | Recuperación queda indisponible hasta aprobar/configurar proveedor; todavía exige monitoreo sin registrar PIN, OTP ni correo claro |
| Auditoría de solicitud, denegación, confirmación y rotación | Permitir investigación y rendición de cuentas sin guardar el secreto | Registra sólo actor interno, acción, resultado, código seguro y `requestId`; debe ser append-only en la BD real y tener retención aprobada |

## Efecto en la legislación chilena

### Ley N.º 19.628 vigente hasta el 30-11-2026

La ley vigente regula el tratamiento de datos personales y exige, entre otros aspectos, finalidad, secreto y diligencia. Endurecer el PIN reduce la probabilidad de acceso no autorizado a datos de usuarios, pedidos y actividad laboral; la expiración y eliminación de material reversible reducen exposición; la auditoría permite investigar incumplimientos. Esto **apoya** los deberes generales, pero la ley no prescribe scrypt, una longitud de PIN ni estos parámetros concretos. Fuente oficial: [BCN, Ley 19.628](https://www.bcn.cl/leychile/navegar?idNorma=141599).

### Ley N.º 21.719 y Ley N.º 19.628 reformada desde el 01-12-2026

La Ley 21.719 entra en vigor el 1 de diciembre de 2026 e incorpora principios de tratamiento, confidencialidad, protección desde el diseño y por defecto, seguridad proporcional al riesgo, gestión de vulneraciones y evaluación de impacto cuando proceda. El rediseño propuesto contribuye de esta forma:

- hash más costoso, límites y serialización: reducen probabilidad de acceso indebido y apoyan seguridad proporcional al riesgo;
- expiración, eliminación y retiro del fingerprint: apoyan minimización, limitación de conservación y configuración protectora por defecto;
- claves versionadas: permiten mantener confidencialidad durante rotaciones y responder a compromisos;
- auditoría sin PIN/OTP ni datos claros: apoya responsabilidad demostrable, detección e investigación sin crear un nuevo repositorio excesivo;
- pruebas concurrentes, de error y de abuso: entregan evidencia técnica para la gestión del riesgo y, si corresponde, una evaluación de impacto.

Estos controles no resuelven por sí solos base jurídica, información a titulares, contratos con encargados, derechos ARCO/portabilidad, retención organizacional, respuesta a incidentes ni transferencias. Fuente oficial y vigencia: [BCN, Ley 21.719](https://www.bcn.cl/leychile/navegar?idNorma=1209272).

## Efecto en las normas ISO usadas por el proyecto

### Impacto directo en seguridad y privacidad

| Norma | Relación con el rediseño PIN | Evidencia que aún sería necesaria |
|---|---|---|
| [ISO/IEC 27001:2022](https://www.iso.org/standard/27001) | Tratamiento de riesgos de autenticación, secretos, acceso, logging e incidentes dentro del SGSI | Evaluación de riesgo aprobada, controles elegidos en la declaración de aplicabilidad, responsables, métricas, revisión y mejora |
| [ISO/IEC 27002:2022](https://www.iso.org/standard/75652.html) | Guía para control de acceso, información de autenticación, criptografía, logging, monitoreo y desarrollo seguro | Procedimientos operativos, segregación, protección de logs, configuración real y evidencias de operación |
| [ISO/IEC 27005:2022](https://www.iso.org/standard/80585.html) | Permite justificar costo scrypt, límites, expiración y riesgo residual mediante evaluación y tratamiento estructurados | Escenarios de amenaza, probabilidad/impacto, propietario del riesgo, aceptación y fecha de revisión |
| [ISO/IEC 27034-1:2011](https://www.iso.org/standard/44378.html) | Integra los controles PIN en el ciclo de seguridad de la aplicación y sus procesos de desarrollo | Requisitos de seguridad, revisión de diseño, trazabilidad y verificación en despliegue |
| [ISO/IEC 27701:2025](https://www.iso.org/standard/27701) | Apoya un PIMS: responsabilidad sobre PII, privacidad por diseño, minimización, incidentes y proveedores | Roles de responsable/encargado, inventario de PII, finalidades, retención, derechos y supervisión del proveedor de entrega |
| [ISO/IEC 29100:2024](https://www.iso.org/standard/85938.html) | Eliminar fingerprint, limitar material reversible y registrar sólo datos mínimos se alinea con salvaguardas y principios de privacidad | Mapeo aprobado de actores, finalidad, necesidad, conservación y controles a lo largo del ciclo de vida |

### Impacto indirecto en calidad, ciclo de vida y pruebas

| Norma | Efecto esperado del trabajo delegado |
|---|---|
| [ISO/IEC 25010:2023](https://committee.iso.org/standard/78176.html) | Mejora características de seguridad, fiabilidad y mantenibilidad; el mayor costo scrypt debe evaluarse también como eficiencia de desempeño |
| [ISO/IEC 25040:2024](https://www.iso.org/standard/83467.html) | Obliga a definir criterios, contexto, métricas y evidencia para evaluar el cambio, no sólo afirmar que es más seguro |
| [ISO/IEC 5055:2021](https://www.iso.org/standard/80623.html) | Favorece código analizable y reduce debilidades estructurales; no sustituye pruebas dinámicas ni revisión criptográfica |
| [ISO/IEC/IEEE 12207:2026](https://www.iso.org/standard/90219.html) | Exige tratar el cambio como evolución controlada: requisitos, implementación, transición, operación, mantenimiento y retiro de claves anteriores |
| [ISO/IEC/IEEE 29119](https://committee.iso.org/sites/jtc1sc7/home/projects/flagship-standards/isoiecieee-29119-series.html) | Sustenta una estrategia de pruebas basada en riesgo: regresión, concurrencia real, abuso, fallos del proveedor, migración y recuperación |

La correspondencia anterior es una interpretación de ingeniería basada en el alcance público de cada norma. No reemplaza el texto licenciado de las normas, una auditoría organizacional ni una evaluación de conformidad.

## Migración y aceptación sugeridas para el equipo PIN

1. Crear una rama separada desde el estado actual y registrar una decisión de arquitectura con propietario de riesgo.
2. Medir latencia, CPU y memoria de scrypt con concurrencia representativa antes de fijar el parámetro productivo.
3. Añadir columnas y migración sin aplicarlas a la base compartida; validar primero en MySQL desechable.
4. Implementar lectura compatible de hashes/claves antiguos y nuevos; no retirar una clave mientras existan pendientes asociados.
5. Probar bloqueo real de fila, cinco intentos exactos, un solo reto activo, un solo consumo y regeneración tras 24 horas.
6. Probar fail-closed productivo y usar un proveedor falso que nunca escriba códigos ni correos en logs.
7. Verificar que respuestas y logs no incluyan PIN, OTP, correo, token, body, SQL ni errores crudos.
8. Aprobar proveedor, retención, monitoreo, procedimiento de rotación e incidente antes de habilitar recuperación productiva.

## Rotación urgente independiente del rediseño

El `PIN_SECRET` observado previamente fue expuesto en contexto de desarrollo. Debe rotarse fuera del repositorio. Con el diseño actual, cambiarlo impide descifrar PIN pendientes y cambia la clave de fingerprint; por eso la rotación debe inventariar, invalidar y regenerar pendientes de forma coordinada. No se debe copiar el valor anterior o nuevo a este informe, tickets, chat, logs ni historial Git.
