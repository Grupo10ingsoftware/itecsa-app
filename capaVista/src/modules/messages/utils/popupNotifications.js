// Los IDs crecientes impiden volver a anunciar mensajes antiguos al limpiar la campana.
export function collectNewNotifications(notifications, previousId) {
  const latestId = notifications.reduce((latest, message) => Math.max(latest, Number(message.id_mensaje)), previousId ?? 0)
  return {
    latestId,
    messages: previousId === null ? [] : notifications
      .filter((message) => Number(message.id_mensaje) > previousId)
      .sort((a, b) => Number(a.id_mensaje) - Number(b.id_mensaje)),
  }
}

export function popupPreview(content) {
  const characters = Array.from(String(content ?? ''))
  return characters.slice(0, 20).join('') + (characters.length > 20 ? '…' : '')
}
