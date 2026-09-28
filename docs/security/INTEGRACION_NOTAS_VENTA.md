# Runbook de integración externa de notas de venta

La implementación activa sigue siendo el fixture sintético validado. El repositorio externo permanece deshabilitado hasta completar estos gates:

- [ ] Motor, versión, esquema y propietario confirmados por el cliente.
- [ ] Vista autorizada mínima definida; debe omitir campos ajenos a creación/reevaluación del pedido.
- [ ] Usuario read-only dedicado, sin privilegios sobre tablas base.
- [ ] TLS con CA verificada, allowlist de red y timeouts probados.
- [ ] Contrato de `SalesNoteRepository.getByNumber()` firmado: número, nombre mínimo de cliente, líneas, cantidades, fecha y origen estable.
- [ ] Identificador estable por línea garantizado y política ante duplicados/ambigüedad aprobada.
- [ ] Retención, cache, disponibilidad y tratamiento de errores definidos.
- [ ] Pruebas de contrato y carga ejecutadas con datos sintéticos o anonimizados.
- [ ] Backups, restauración y fase 4 confirmados por el cliente.

Nunca se habilita la fuente externa cambiando sólo una URL. Debe implementarse el adaptador deshabilitado, superar contract tests y pasar revisión de seguridad antes de activar su feature flag.
