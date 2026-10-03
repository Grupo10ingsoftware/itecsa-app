import assert from 'node:assert/strict'
import { buildCreateOrderPayload } from '../src/modules/orders/utils/createOrderPayload.js'

export function run() {
  for (const priority of [null, 'urgent', 'contract']) {
    const payload = buildCreateOrderPayload({
      managerRecord: { numeroNota: '123', cliente: { rut: '99', nombre: 'Cliente' }, items: [{ cantidad: 500 }], origen: { usuarioManager: 'vendedor' }, observaciones: 'Origen', fechaEntregaTentativaOrigen: '2026-10-01', itemsSinSeguimientoProductivo: [] },
      comments: ' Observacion interna ', priority,
    })
    assert.deepEqual(payload, { numeroNota: '123', observacionInterna: 'Observacion interna', priority })
  }
  console.log('3 verificaciones frontend: contrato minimo de creacion H09 OK')
}
