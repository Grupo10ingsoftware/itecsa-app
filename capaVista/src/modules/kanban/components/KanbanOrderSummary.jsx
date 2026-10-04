import styles from '../styles/Kanban.module.css';
import { getManufacturingDetails, isLanyardItem } from '../utils/kanbanDetail.js';

export function KanbanOrderSummary({ order, orderItems }) {
  return (
    <section className={styles.detailSection}>
      <h3>Resumen</h3>
      {Array.isArray(order.labels) && order.labels.length > 0 && (
        <div className={styles.visibleLabels}>
          {order.labels.map((label) => (
            <span key={label.id ?? label.name}>
              {label.name}
            </span>
          ))}
        </div>
      )}
      <div className={styles.summaryStack}>
        {orderItems.map((item) => {
          const manufacturingDetails = getManufacturingDetails(item, order)
          const isLanyard = isLanyardItem(item)

          return (
            <article className={styles.summaryCard} key={item.id}>
              <h4>{item.product}</h4>
              <dl className={styles.detailList}>
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
                <div>
                  <dt>Cliente</dt>
                  <dd>{order.clientName}</dd>
                </div>
                <div>
                  <dt>Vendedor responsable</dt>
                  <dd>{manufacturingDetails.seller}</dd>
                </div>
              </dl>
            </article>
          )
        })}
      </div>
    </section>
  )
}
