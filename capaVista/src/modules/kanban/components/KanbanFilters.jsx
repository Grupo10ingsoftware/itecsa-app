import {useState} from 'react';
import Collapse from 'react-bootstrap/Collapse';
import styles from '../styles/Kanban.module.css';

/*
Número de nota de venta 
Número de orden de producción 
Nombre del cliente 
Vendedor que emitió la nota de venta
 */

export default function KanbanFilters() {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="col-5 mb-1">
      <button
        className={` ${styles['filter-btn']} btn `}
        onClick={() => setShowFilters(!showFilters)}
        
      >
        Filtros <i className="bi bi-funnel"></i>
      </button>

      <Collapse in={showFilters}>
        <div>
          <div className={`card card-body mt-3 ${styles['filter-card']}`}>
            <input className="form-control mb-2" type="text" placeholder="Número de nota de venta" />
            <input className="form-control mb-2" type="text" placeholder="Número de orden de producción" />
            <input className="form-control mb-2" type="text" placeholder="Nombre del cliente" />
            <select className="form-select mb-2">
              <option>Seleccionar vendedor</option>
            </select>
            <div className="card-body">
                <div className="row mt-1">   
                        <button className={`${styles['apply-filter-btn']} btn mb-2`}>Aplicar filtros</button>
                        <button className={`${styles['reset-filter-btn']} btn mb-2`}>Limpiar</button>                    
                </div>

            </div>
          </div>
        </div>
      </Collapse>

    

    </div>
  );
}
