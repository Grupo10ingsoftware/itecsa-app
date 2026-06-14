# Modulo `payments` / Cobranzas

La vista `/pagos` carga pedidos reales desde backend y permite gestionar el estado de pago usando la base de datos real. Los mocks historicos se conservan como fixtures de desarrollo y documentacion del shape esperado, pero no alimentan el flujo productivo.

## Contratos backend usados

- `GET /api/orders`: lista pedidos reales con cliente, RUT, razon social, producto, etapa, estado de pago y datos documentales disponibles.
- `GET /api/payment-status`: lista estados reales de pago.
- `PATCH /api/orders/:orderId/payment-status`: actualiza el estado de pago del pedido y registra auditoria en `Registro_Pago`.
- `GET /api/orders/:orderId/payment-signature-preview`: obtiene una vista previa PDF firmada antes de confirmar pago, sin persistir la firma.
- `GET /api/orders/:orderId/payment-signature-evidence`: obtiene el archivo de evidencia de firma del pago ya confirmado.
- `GET /api/orders/:orderId/payment-records`: consulta registros de auditoria del pedido cuando se requiera.

## Estados reales de pago

La BD real usa estos IDs:

- `1`: `Pendiente`
- `2`: `Confirmado`
- `3`: `Rechazado`

El frontend no debe hardcodear IDs antiguos. La vista resuelve el ID desde `GET /api/payment-status` antes de llamar al PATCH. Si el pago ya esta `Confirmado`, la UI bloquea cambios a `Pendiente` o `Rechazado`; el backend tambien rechaza esa transicion. Confirmar un pago firma la Nota de Venta vigente en backend, registra auditoria y mueve la orden a `Listo para produccion`.

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

## Mocks conservados

- `mocks/paymentOrders.mock.js`: fixture historico con el shape UI esperado.
- `mocks/paymentTransitions.mock.js`: referencia de la transicion visual antigua; no debe controlar el flujo real.
- `mocks/paymentDocuments.mock.js` y `mocks/documents/*`: PDFs demo para desarrollo aislado; no se usan como fallback automatico productivo.

## Reglas de UI

- `view:payments-module` protege el acceso a la ruta.
- `update:payment-status` habilita acciones de cambio de estado.
- La vista cubre loading, error con reintento, estado vacio y ausencia de PDF.
- Si `ruta_pdf` no existe, el boton de Nota de Venta se deshabilita y no se inventan rutas ni PDFs.
- El modal de confirmacion mantiene el flujo de hold, pero el cambio real se persiste en backend.
- La evidencia de firma se abre solo cuando backend expone `firma_pago.evidenceUrl`.

## Auditoria

`Registro_Pago.id_usuario` se resuelve en backend desde `req.auth.payload.sub` contra `Usuario.id_auth0`. El frontend no envia ni controla `id_usuario`.
