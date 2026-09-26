# Modulo `payments` / Cobranzas

La vista `/pagos` carga pedidos reales desde backend y permite gestionar el estado de pago usando la base de datos real. Los mocks historicos se conservan como fixtures de desarrollo y documentacion del shape esperado, pero no alimentan el flujo productivo.

## Contratos backend usados

- `GET /api/orders/payments`: carga en una sola solicitud la lista liviana de cobranzas y los estados reales de pago.
- `GET /api/orders/:orderId/payment-records/preview`: obtiene vendedor y detalle completo de productos para los modales de pago.
- `PATCH /api/orders/:orderId/payment-status`: actualiza el estado de pago del pedido con PIN y registra auditoria en `Registro_Pago`.
- `GET /api/orders/:orderId/payment-records`: consulta registros de auditoria del pedido cuando se requiera.

## Estados reales de pago

La BD real usa estos IDs:

- `1`: `Pendiente`
- `2`: `Confirmado`
- `3`: `Rechazado`

El frontend no debe hardcodear IDs antiguos. La vista resuelve el ID desde `GET /api/payment-status` antes de llamar al PATCH. Operario Cobranzas solo gestiona pagos pendientes. Administrador Cobranzas y Soporte pueden cambiar una decision entre `Confirmado` y `Rechazado`, indicando un motivo, pero ningun pago resuelto puede volver a `Pendiente`.

Confirmar un pago valida el PIN, registra auditoria y mueve la orden a `Listo para produccion`. Si un pago confirmado se rechaza mientras esta `Listo para produccion`, el pedido pasa a `Cancelado` y se notifica a Administracion de Produccion. Si la produccion ya comenzo, conserva su etapa y se notifica que debe cancelarse desde Produccion.

## Estructura relevante

```txt
payments/
├── api/
│   └── paymentsApi.js
├── components/
├── hooks/
│   └── usePaymentsApi.js
├── mocks/
├── pages/
│   └── PaymentConfirmationPage.jsx
└── utils/
    ├── paymentDocuments.js
    └── paymentOrders.js
```

## Reglas de UI

- `read:payments` protege el acceso a la ruta.
- `update:payment-status` habilita acciones de cambio de estado.
- La vista cubre loading, error con reintento y estado vacio.
- La fecha de creacion se filtra mediante un rango inclusivo `Desde` / `Hasta`; la busqueda textual cubre RUT, Nota de Venta y cliente.
- Los modales de confirmacion y detalle usan informacion registrada y no dependen de PDFs.
- El backend vuelve a validar permisos y transiciones aunque la opcion no sea visible en la interfaz.

## Auditoria

`Registro_Pago.id_usuario` se resuelve en backend desde `req.auth.payload.sub` contra `Usuario.id_auth0`. El frontend no envia ni controla `id_usuario`.
