import Offcanvas from 'react-bootstrap/Offcanvas';
import styles from './styles/OrderDetail.module.css'

const OrderDetail = ({ clientName, nv, product, date }) => {
  return (
    <div className={styles.detailsContainer}>
        
        {/* Detalle */}
        <h6 className={styles.sectionTitle}>Datos Comerciales</h6>
        <div className="d-flex flex-column gap-1">
            <div className={styles.dataItem}>
                <span className={styles.label}>Cliente:</span> 
                <span className={styles.value}>{clientName}</span>
            </div>
            <div className={styles.dataItem}>
                <span className={styles.label}>NV:</span> 
                <span className={styles.value}>{nv}</span>
            </div>
            <div className={styles.dataItem}>
                <span className={styles.label}>Fecha:</span> 
                <span className={styles.value}>{date}</span>
            </div>
            <div className={styles.dataItem}>
                <span className={styles.label}>Producto:</span> 
                <span className={`${styles.value} text-truncate`} style={{maxWidth: '130px'}}>
                    {product}
                </span>
            </div>
        </div>

        {/* Producción y Avance */}
        <h6 className={styles.sectionTitle}>Producción y Avance</h6>
        <div className="d-flex flex-column">
            <div className={styles.processItem}>
                <div className="d-flex align-items-center">
                    <span className={`${styles.statusCircle} bg-success`}></span>
                    <span className={`${styles.text08} fw-bold`}>Impresión</span>
                </div>
                <span className="text-muted small" style={{fontSize: '0.7rem'}}>Hecho</span>
            </div>
            <div className={styles.processItem}>
                <div className="d-flex align-items-center">
                    <span className={`${styles.statusCircle} bg-warning`}></span>
                    <span className={`${styles.text08} fw-bold text-dark`}>Corte</span>
                </div>
                <span className="text-warning fw-bold small" style={{fontSize: '0.7rem'}}>En curso</span>
            </div>
            <div className={styles.processItem}>
                <div className="d-flex align-items-center">
                    <span className={`${styles.statusCircle} bg-secondary`}></span>
                    <span className={`${styles.text08} text-muted`}>Costura</span>
                </div>
                <span className="text-muted small" style={{fontSize: '0.7rem'}}>Pendiente</span>
            </div>
        </div>

        {/* Historial */}
        <h6 className={styles.sectionTitle}>Historial</h6>
        <div className="d-flex flex-column mb-1">

            <div className={styles.timelineItem}>
                <span className={`${styles.timelineDot} bg-primary`}></span>
                <div className="d-flex justify-content-between align-items-start mb-1">
                    <span className="fw-bold text-dark" style={{fontSize: '0.75rem'}}>Pago confirmado</span>
                    <span className="text-muted" style={{fontSize: '0.65rem'}}>09-05</span>
                </div>
                <p className="mb-0 text-secondary" style={{fontSize: '0.7rem', lineHeight: '1.2'}}>Revisión Cobranzas</p>
            </div>

            <div className={styles.timelineItem}>
                <span className={`${styles.timelineDot} bg-secondary`}></span>
                <div className="d-flex justify-content-between align-items-start mb-1">
                    <span className="fw-bold text-secondary" style={{fontSize: '0.75rem'}}>Pedido creado</span>
                    <span className="text-muted" style={{fontSize: '0.65rem'}}>08-05</span>
                </div>
                <p className="mb-0 text-secondary" style={{fontSize: '0.7rem', lineHeight: '1.2'}}>Juan Pérez</p>
            </div>

        </div>

        {/* Comentarios */}
        <h6 className={styles.sectionTitle}>Comentarios</h6>
        <div className={styles.commentsScroll}>
            <div className={styles.commentBubble}>
                <div className="d-flex justify-content-between mb-1 fw-bold text-dark" style={{fontSize: '0.7rem'}}>
                    <span>Diego</span>
                    <span className="text-muted">08-05</span>
                </div>
                <p className="mb-0 text-secondary" style={{lineHeight: '1.2'}}>Falta que envíen el OP definitivo.</p>
            </div>
        </div>
        <div className="mt-2 pt-2 border-top">
            <textarea 
                className={`form-control form-control-sm mb-1 ${styles.textAreaFixed}`} 
                rows="1" 
                placeholder="Escribir comentario..."
            ></textarea>
            <button className={`btn btn-sm w-100 py-1 text-white fw-medium ${styles.btnPrimary}`}>
                Enviar
            </button>
        </div>

    </div>
  );
}

export default OrderDetail;