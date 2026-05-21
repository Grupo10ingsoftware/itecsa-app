import React from 'react'

function KanbanBoardPage() {
  
const columns = [ 
  {
    title: "Confirmación de pago",
    color: "#B388FF"
  },
  {
    title: "Listo para producción",
    color: "#64B5F6"
  },
  {
    title: "En producción",
    color: "#F4A261"
  },
  {
    title: "Listo para entrega",
    color: "#7ED957"
  }
]

  return (
    <div className="d-flex gap-3 justify-content-center align-items-center"
    style={{
      minHeight: '100vh'
        }}>
      {columns.map((column) => (
        <div 
        key={column.title}
        className="bg-light rounded p-3"
        style={{
          width: '250px',
          height: '500px'

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
  )
}

export default KanbanBoardPage
