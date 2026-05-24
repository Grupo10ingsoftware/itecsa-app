import KanbanCard from "../components/KanbanCard"
import KanbanColumn from "../components/KanbanColumn"
import KanbanFilters from "../components/KanbanFilters"



export default function KanbanBoardPage() {
  return (
    <section className="p-4">
      <div className="mb-4">
        <h1 className="h4 mb-2">Kanban</h1>
        <p className="text-secondary mb-0">
          Vista principal de seguimiento de producción.
        </p>
      </div>
      <div className="row ">
        <KanbanFilters></KanbanFilters>
      </div>
      <hr />
      <div className="row">
        <KanbanColumn/>
      </div>
      
    </section>
  )
}