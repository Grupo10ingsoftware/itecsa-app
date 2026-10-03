import { getCalendarOrderItems, formatScheduleState, displayValue, getManufacturingDetails, isLanyardItem } from '../utils/calendarPresentation.js';
import styles from './ProductionCalendarGrid.module.css';

export function OrderDetailModal({ order, onClose }) {
  if (!order) return null

  const orderItems = getCalendarOrderItems(order)

  return (
    <div className={styles.modalLayer} onMouseDown={onClose} role="presentation">
      <section
        aria-labelledby="calendar-order-detail-title"
        aria-modal="true"
        className={styles.orderDetailModal}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className={styles.modalHeader}>
          <div>
            <span>{order.orderNumber}</span>
            <h2 id="calendar-order-detail-title">Detalle del pedido</h2>
          </div>
          <button aria-label="Cerrar detalle" onClick={onClose} type="button">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.orderDetailBody}>
          <section className={styles.orderOverview} aria-label="Resumen del pedido">
            <div>
              <dt>Cliente</dt>
              <dd>{order.clientName}</dd>
            </div>
            <div>
              <dt>Etapa</dt>
              <dd>{formatScheduleState(order)}</dd>
            </div>
            <div>
              <dt>Fecha de Entrega</dt>
              <dd>{displayValue(order.dueDate, 'Por definir')}</dd>
            </div>
            <div>
              <dt>Vendedor responsable</dt>
              <dd>{displayValue(order.seller, 'Ventas ITECSA')}</dd>
            </div>
          </section>

          <section className={styles.detailProducts} aria-label="Productos del pedido">
            {orderItems.map((item) => {
              const manufacturingDetails = getManufacturingDetails(item, order)
              const isLanyard = isLanyardItem(item)

              return (
                <article className={styles.detailProductCard} key={item.id}>
                  <h3>{item.product}</h3>
                  <dl>
                    <div>
                      <dt>Fecha de Entrega</dt>
                      <dd>{manufacturingDetails.dueDate}</dd>
                    </div>
                    <div>
                      <dt>Tipo de producto</dt>
                      <dd>{item.product}</dd>
                    </div>
                    <div>
                      <dt>Cantidad</dt>
                      <dd>{item.quantity ?? 'No definida'}</dd>
                    </div>
                    <div>
                      <dt>Ancho {isLanyard ? 'Cinta' : ''}</dt>
                      <dd>{manufacturingDetails.width}</dd>
                    </div>
                    <div>
                      <dt>Largo {isLanyard ? 'Cinta' : ''}</dt>
                      <dd>{manufacturingDetails.length}</dd>
                    </div>
                    {isLanyard ? (
                      <>
                        <div>
                          <dt>Textura cinta</dt>
                          <dd>{manufacturingDetails.tapeTexture}</dd>
                        </div>
                        <div>
                          <dt>Color de Fondo</dt>
                          <dd>{manufacturingDetails.backgroundColor}</dd>
                        </div>
                        <div>
                          <dt>Leyenda Reversa</dt>
                          <dd>{manufacturingDetails.reverseLegend}</dd>
                        </div>
                        <div>
                          <dt>Leyenda Anverso</dt>
                          <dd>{manufacturingDetails.frontLegend}</dd>
                        </div>
                        <div>
                          <dt>Terminaciones</dt>
                          <dd>{manufacturingDetails.endings}</dd>
                        </div>
                      </>
                    ) : (
                      <div>
                        <dt>Tipo de tarjeta</dt>
                        <dd>{manufacturingDetails.cardType}</dd>
                      </div>
                    )}
                  </dl>
                </article>
              )
            })}
          </section>
        </div>
      </section>
    </div>
  )
}
