# Runbook de entrega y rotación de secretos

Los secretos se entregan exclusivamente mediante el gestor de secretos aprobado. No se envían por Git, correo, chat, capturas, tickets ni archivos `.env` compartidos. Los `.env` locales deben permanecer con modo `0600`.

## Rotación

1. Crear una versión nueva con mínimo 32 bytes aleatorios donde corresponda.
2. Desplegar primero la capacidad de leer la versión nueva y, durante una transición controlada, la anterior.
3. Cambiar la versión activa y verificar health/readiness, autenticación y una operación controlada.
4. Revocar la credencial anterior y confirmar que no aparece en logs, artefactos ni historial nuevo.
5. Registrar responsable, sistema, versión, fecha de activación y próxima revisión, nunca el valor.

El rediseño y versionado de claves PIN está delegado y se describe en [INFORME_CAMBIOS_PIN_DELEGADOS.md](INFORME_CAMBIOS_PIN_DELEGADOS.md). Esta entrega conserva el contrato existente `PIN_SECRET`; su valor expuesto debe rotarse fuera del repositorio con coordinación previa sobre los PIN pendientes.

## Rotaciones obligatorias de esta entrega

- [ ] Auth0 Management Client Secret.
- [ ] Contraseña del usuario de base de datos.
- [ ] Claves PIN previamente expuestas.
- [ ] Secretos HMAC de cuotas y correlación.
