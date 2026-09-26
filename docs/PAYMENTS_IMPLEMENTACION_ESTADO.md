# Estado de implementación de Payments

Este seguimiento complementa [la auditoría inicial](../PAYMENTS_AUDITORIA_PLAN_ACCION.md), que describe el sistema en `0b3d83e`. Sus hallazgos y su frase "implementación no iniciada" son históricos. La implementación comenzó en `103eab8`, sobre `c60cdf9`.

| Acción | Estado al 26-09-2026 | Evidencia y trabajo pendiente |
|---|---|---|
| PAY-ACT-001 | Código aplicado | Los cinco handlers propios de Payments devuelven un 500 genérico con referencia y conservan los 4xx. Tests de controlador cubren fallos internos; falta prueba HTTP con autenticación real. |
| PAY-ACT-002 | Código aplicado; validación real pendiente | `updPaymentState` bloquea `Pedidos` con `SELECT ... FOR UPDATE` dentro de la transacción, relee el estado y retorna 409 ante una decisión concurrente distinta. Tests con dobles cubren dos decisiones y reintento idempotente. Falta reproducir concurrencia y rollback en MySQL aislado; no usar la base compartida para escribir. |
| PAY-ACT-003 | Código aplicado; validación real pendiente | Las nuevas transiciones pasan y guardan `id_estado_pago_anterior`. Tests de servicio/repositorio verifican el par anterior/nuevo. Falta comprobar el historial en MySQL aislado. Los registros históricos con anterior NULL no se modificaron. |
| PAY-ACT-004 | Espera regla de negocio | Definir la matriz pago × etapa con Cobranzas y Producción. La revisión Rechazado→Confirmado todavía puede forzar la etapa 1. |
| PAY-ACT-005 | Código aplicado; prueba interactiva pendiente | El modal se desmonta al cerrar y limpia el PIN tras el intento. Las pruebas SSR y el build pasan, pero falta comprobar cerrar/reabrir, fallo, éxito y foco en un navegador con una sesión de prueba. |
| PAY-ACT-006 | Bloqueada | Faltan reconciliación de migraciones, copia aislada, contrato de Manager incorporado y política de identidad de líneas/históricos. No se aplicó DDL ni se cambió la fuente. |
| PAY-ACT-007 | Espera política de acceso | Definir qué roles pueden ver actor y motivo del historial. La ruta conserva `read:orders`. |
| PAY-ACT-008 | Sin optimización | Faltan volumen representativo y presupuesto de latencia/render. No hay base para afirmar una mejora de rendimiento. |
| PAY-ACT-009 | Aplicada | README y modal ya describen `req.pinActor`, el fixture y la ausencia de integración directa con Manager. |

Validación de `103eab8`: 657 tests de backend, pruebas de frontend, build Vite, ESLint dirigido y `git diff --check` pasaron. Esta evidencia no sustituye la prueba de concurrencia/rollback en MySQL aislado, la prueba interactiva del PIN ni la revisión legal y organizacional del tratamiento de datos.
