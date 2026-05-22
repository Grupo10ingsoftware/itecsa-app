const columns = [
  {
    title: 'Confirmación de pago',
    color: '#B388FF',
  },
  {
    title: 'Listo para producción',
    color: '#64B5F6',
  },
  {
    title: 'En producción',
    color: '#F4A261',
  },
  {
    title: 'Listo para entrega',
    color: '#7ED957',
  },
]

export default function KanbanBoardPage() {
  return (
    <section className="p-4">
      <div className="mb-4">
        <h1 className="h4 mb-2">Kanban</h1>
        <p className="text-secondary mb-0">
          Vista principal de seguimiento de producción.
        </p>
      </div>

      <div className="d-flex flex-wrap gap-3 justify-content-center align-items-start">
        {columns.map((column) => (
          <div
            key={column.title}
            className="bg-light rounded p-3 shadow-sm"
            style={{
              width: '250px',
              minHeight: '500px',
            }}
          >
            <div
              className="rounded text-center fw-bold mb-3"
              style={{
                backgroundColor: column.color,
                padding: '10px',
              }}
            >
              {column.title}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}