import assert from 'node:assert/strict'
import { test } from 'node:test'
import { collectNewNotifications, popupPreview } from '../src/modules/messages/utils/popupNotifications.js'

test('no anuncia mensajes antiguos en la primera carga', () => {
  assert.deepEqual(collectNewNotifications([{ id_mensaje: 8 }], null), { latestId: 8, messages: [] })
})
test('anuncia nuevos mensajes en orden y no repite los ya detectados', () => {
  const messages = [{ id_mensaje: 10 }, { id_mensaje: 9 }, { id_mensaje: 8 }]
  assert.deepEqual(collectNewNotifications(messages, 8).messages, [{ id_mensaje: 9 }, { id_mensaje: 10 }])
  assert.deepEqual(collectNewNotifications(messages, 10).messages, [])
})
test('limpiar la campana no permite anunciar antiguos que reaparezcan', () => {
  assert.equal(collectNewNotifications([], 10).latestId, 10)
  assert.deepEqual(collectNewNotifications([{ id_mensaje: 2 }], 10).messages, [])
})
test('detecta el primer mensaje después de una bandeja vacía', () => {
  const baseline = collectNewNotifications([], null)
  assert.equal(collectNewNotifications([{ id_mensaje: 1 }], baseline.latestId).messages.length, 1)
})
test('preview conserva los primeros 20 caracteres sin cortar emojis', () => {
  assert.equal(popupPreview('12345678901234567890 resto'), '12345678901234567890…')
  assert.equal(popupPreview('😀'.repeat(21)), '😀'.repeat(20) + '…')
  assert.equal(popupPreview('Hola'), 'Hola')
  assert.equal(popupPreview(null), '')
})
