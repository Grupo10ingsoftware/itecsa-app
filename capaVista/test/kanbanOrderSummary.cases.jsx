import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { KanbanOrderSummary } from '../src/modules/kanban/components/KanbanOrderSummary.jsx'
import { hasOrderLabel as calendarHasOrderLabel } from '../src/modules/productionCalendar/utils/calendarPresentation.js'

export function run() {
  const html = renderToStaticMarkup(
    <KanbanOrderSummary
      order={{
        clientName: 'Cliente',
        dueDate: null,
        seller: null,
        labels: [{ id: 5, name: 'Urgencia' }],
      }}
      orderItems={[]}
    />,
  )

  assert.match(html, /Urgencia/)
  assert.doesNotMatch(html, /id_etiqueta|nombre_etiqueta/)
  assert.equal(calendarHasOrderLabel({ labels: [{ id: 5, name: 'Urgencia' }] }, ['Urgencia']), true)
  assert.equal(calendarHasOrderLabel({ labels: [{ id_etiqueta: 5, nombre_etiqueta: 'Urgencia' }] }, ['Urgencia']), false)
}
