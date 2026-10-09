export function buildCreateOrderPayload(draft) {
  return {
    numeroNota: draft.managerRecord.numeroNota,
    observacionInterna: draft.comments?.trim() || null,
    priority: draft.priority,
  }
}
