# Runbook de entrega y rotación de secretos

Los secretos se entregan exclusivamente mediante el gestor de secretos aprobado. No se envían por Git, correo, chat, capturas, tickets ni archivos `.env` compartidos. Los `.env` locales deben permanecer con modo `0600`.

## Rotación

1. Crear una versión nueva con mínimo 32 bytes aleatorios donde corresponda.
2. Desplegar primero la capacidad de leer la versión nueva y, durante una transición controlada, la anterior.
3. Cambiar la versión activa y verificar health/readiness, autenticación y una operación controlada.
4. Revocar la credencial anterior y confirmar que no aparece en logs, artefactos ni historial nuevo.
5. Registrar responsable, sistema, versión, fecha de activación y próxima revisión, nunca el valor.

El estado implementado de hashing y derivación de claves está en [H06](H06-pin-lifecycle.md); las transacciones y entrega integradas se describen en [la integración](../INTEGRACION_FIX_21709.md). Se conserva `PIN_SECRET`: la rotación y el keyring requieren coordinación sobre pendientes y fingerprints. La [propuesta delegada](INFORME_CAMBIOS_PIN_DELEGADOS.md) conserva contexto histórico, no el diseño vigente.

## Rotaciones obligatorias de esta entrega

- [ ] Auth0 Management Client Secret.
- [ ] Contraseña del usuario de base de datos.
- [ ] Claves PIN previamente expuestas.
- [ ] Secretos HMAC de cuotas y correlación.
