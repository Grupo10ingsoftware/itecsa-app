# P05 — cierre del inventario de código huérfano

Revisión del árbol de `dev` en `3e44bf3` (03-10-2026). La auditoría original examinó `2514160`; su cifra de 28 archivos JS/JSX no alcanzables describe aquel snapshot y no es un objetivo de eliminación para revisiones posteriores. Este cierre documenta el destino de los candidatos de P05, no certifica que todo el repositorio esté libre de código sin uso.

## Decisión y cambios

El [PR #76](https://github.com/Grupo10ingsoftware/itecsa-app/pull/76), commit `3e0337d` y merge `ec05c2c`, retiró 17 archivos y actualizó un test de rutas. Antes del retiro se revisaron entradas de frontend y backend, imports directos y dinámicos, alias `@/`, rutas, tests, configuración, documentación y uso manual. El middleware `requirePermission` no tenía rutas consumidoras: sólo lo importaba su test. `requireCapability` ya protegía las rutas; además de comprobar el permiso del token, verifica que el rol lo tenga asignado. Por esa diferencia de contrato se eliminó el test exclusivo del middleware antiguo y se mantuvieron las pruebas de autorización vigente. El test de orden de middlewares conservó su comprobación y pasó a nombrar `authorizePaymentStatusUpdate`.

| Grupo del inventario | Resultado en `dev` | Evidencia y límite |
| --- | --- | --- |
| `requirePermission.js` y su test | Retirados por el PR #76 | `requireCapability` sigue importado por las rutas; el PR no cambió permisos ni endpoints. |
| `LoginForm.jsx`, `PasswordRules.jsx`, `authValidation.js` | Retirados por el PR #76 | Sin entrada de ruta ni import vigente al revisarlos; `LoginPage`, recuperación de contraseña y validación de alta continuaron por sus flujos propios. |
| `CalendarSummaryCards.jsx` y CSS | Retirados por el PR #76 | La página de Calendario utilizaba su cuadrícula y filtros, sin montar estas tarjetas. No se declaró un reemplazo visual idéntico. |
| `StatusBadge.jsx`, `useFormValidation.js`, `useRoleAccess.js`, `validator.js`, `validators.js`, `formatters.js`, `productTypes.js` y `SelectInput.module.css` | Retirados por el PR #76 | No tenían consumidores vigentes; tres de los archivos estaban vacíos. Los badges específicos de Users y Payments permanecieron activos. |
| `UserCreatePage` y CSS | Ya retirados en `47db7f6` | `/admin/usuarios/nuevo` redirige al listado; el alta actual utiliza el modal y formulario de Gestión de Usuarios. Se conserva la redirección para enlaces existentes. |
| `modules/productionHistory/**` | Ya retirado en `7de3dad` (P03) | Las rutas vigentes de Historial cargan `orderHistory`. No se hizo otra eliminación P03 en el PR #76. |

## Candidatos conservados o cambiados por otras ramas

- `SelectInput.jsx` y `TextInput.jsx` se retiraron en el PR #76 porque entonces no tenían consumidor. En el `dev` revisado existen de nuevo y **son código activo**: `DataRequestForm` e `IncidentReportForm` los importan. No deben volver a clasificarse como huérfanos por su presencia en el inventario original.
- `requirementsMap.js` se conservó en el plan P05 por sus referencias documentales y por la duda sobre su uso como referencia de desarrollo. El commit `b3cf2b8` lo retiró en otra limpieza; las referencias que quedan están en documentos archivados y apuntan a una revisión histórica de Git. Ese mapa parcial no acreditaba cobertura RF01–RF75.
- `mockups-muestras/` se conservó durante el análisis P05: era un prototipo HTML manual enlazado desde la documentación, fuera del build. `b3cf2b8` lo retiró posteriormente junto con su enlace del índice vigente. Su eliminación no fue parte del PR #76.
- `productionCalendar.mock.js` tenía constantes usadas por Calendario y 15 registros de muestra sin consumidor. P05 no lo eliminó. `499f0c9` trasladó las constantes a `productionCalendar.config.js` y retiró el mock en el trabajo de P04; página y filtros importan ahora la configuración.

## Evidencia de validación y alcance del cierre

En el PR #76, el job `verify` de *Security and quality gates* pasó: validación Prisma/MySQL aislado, pruebas backend, pruebas frontend, lint, build, auditoría de dependencias y control de artefactos protegidos. `git diff --check` no mostró errores y la búsqueda posterior no encontró referencias a los nombres retirados, salvo nombres genéricos de variables sin relación. El job `secrets` falló porque Gitleaks, configurado para revisar **todo el historial**, informó dos detecciones; el cambio P05 sólo eliminó archivos y cambió tres cadenas de un test. El fallo del escaneo histórico permanece como asunto separado y no se presenta como un gate aprobado.

El estado actual de `dev` incorpora cambios posteriores al PR #76, entre ellos nuevas pantallas que utilizan los dos inputs compartidos y una limpieza de suites de prueba. El resultado verde de aquel PR acredita su revisión integrada, no una nueva ejecución completa sobre `3e44bf3`. P05 se cierra respecto de los candidatos inventariados y sus contratos reemplazados; no cierra P03, P04, P06, P24 ni obligaciones operativas ajenas a ese inventario.
