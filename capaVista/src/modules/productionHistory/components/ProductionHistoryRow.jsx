import { Link } from 'react-router-dom'
import { APP_ROUTES } from '../../../config/routes'
import styles from './ProductionHistoryTable.module.css'

export default function ProductionHistoryRow({ order }) {
  const detailPath = APP_ROUTES.PRODUCTION_HISTORY_DETAIL.replace(':pedidoId', order.id)

  return (
    <tr>
      <td className={styles.orderCell}>
        <strong>{order.orderNumber}</strong>
        <span>{order.managerOrderId}</span>
      </td>
      <td className={styles.productCell}>{order.productType}</td>
      <td className={styles.clientCell}>{order.clientName}</td>
      <td>{order.sellerName}</td>
      <td>{order.orderStatus ?? 'Sin estado'}</td>
      <td>
        <span className={styles.sampleCount}>
          {order.sampleCount}
          {order.hasFinalSample && <i className="bi bi-check-circle-fill" aria-hidden="true" />}
        </span>
      </td>
      <td className={styles.actionsCell}>
        <Link className={styles.historyButton} to={detailPath}>
          Ver historial
          <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </td>
    </tr>
  )
}
