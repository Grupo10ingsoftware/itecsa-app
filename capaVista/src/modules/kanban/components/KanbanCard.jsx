import styles from '../styles/Kanban.module.css';




import {useDraggable} from '@dnd-kit/react';




function KanbanCard({ clientName, nv, product, date }){
    const {ref} = useDraggable({
    id: nv,
    });
    return(
        <div className={`card p-3 mb-2 ${styles['order-card']}`} ref={ref}>
            <h5 className="card-title">{clientName}</h5>
            <p className="card-text">NV: {nv}</p>
            <p className="card-text">Producto: {product}</p>
            <p className="card-text">Fecha: {date}</p>
            <button className="btn btn-sm btn-outline-primary">Detalle</button>
        </div>
    )
}
export default KanbanCard;