import Offcanvas from 'react-bootstrap/Offcanvas';
import OrderDetail from '../../orders/OrderDetail.jsx';
import styles from '../styles/KanbanOffCanvas.module.css'

function KanbanOffCanvas({ isOpen, onClose, order, onUpdateOrder }) {
    if (!order) return null;

    return (
        <Offcanvas
            show={isOpen}
            onHide={onClose}
            placement="end"
            backdrop={true}
        >
            <Offcanvas.Header closeButton className={styles.customHeader}>
                <Offcanvas.Title className={styles.customTitle}>
                    Detalle del pedido
                </Offcanvas.Title>
            </Offcanvas.Header>

            <Offcanvas.Body className={styles.customBody}>
                <OrderDetail
                    clientName={order.clientName}
                    nv={order.nv}
                    product={order.product}
                    date={order.date}
                    order={order}
                    onUpdateOrder={onUpdateOrder}
                />
            </Offcanvas.Body>
        </Offcanvas>
    );
}

export default KanbanOffCanvas;