import { formatPaymentDateTime } from '../utils/paymentDocuments'
import PaymentRowActions from './PaymentRowActions'
import PaymentStatusBadge from './PaymentStatusBadge'
import SalesNoteButton from './SalesNoteButton'
import styles from './PaymentOrdersTable.module.css'

export default function PaymentOrdersTable({
  canUpdatePaymentStatus,
  editingStatus,
  isUpdatingPaymentStatus = false,
  orders,
  onCloseEditor,
  onOpenSalesNote,
  onSelectStatus,
  onToggleEditor,
  onViewSignedDetail,
}) {
  return (
    <section
      className={`d-none d-lg-block ${styles.desktopTableWrap}`}
      aria-label="Tabla de pagos"
    >
      <table className={`table table-hover align-middle mb-0 ${styles.paymentTable}`}>
        <colgroup>
          <col className={styles.colOrder} />
          <col className={styles.colDate} />
          <col className={styles.colClient} />
          <col className={styles.colRut} />
          <col className={styles.colSalesNote} />
          <col className={styles.colPaymentStatus} />
          <col className={styles.colActions} />
        </colgroup>

        <thead>
          <tr>
            <th>Pedido</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th className={styles.rutColumn}>RUT</th>
            <th>Ver Nota de Venta</th>
            <th>Estado pago</th>
            <th className={styles.actionsColumn}>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {orders.length > 0 ? (
            orders.map((order) => (
              <tr key={order.id}>
                <td className={styles.orderCell}>{order.nvNumber}</td>
                <td className={styles.dateCell}>
                  {formatPaymentDateTime(order.createdAt)}
                </td>
                <td className={styles.clientCell}>{order.companyName}</td>
                <td className={styles.rutCell}>{order.rut}</td>
                <td>
                  <SalesNoteButton order={order} onOpen={onOpenSalesNote} />
                </td>
                <td>
                  <PaymentStatusBadge status={order.paymentStatus} />
                </td>
                <td className={styles.actionsCell}>
                  <PaymentRowActions
                    canUpdatePaymentStatus={canUpdatePaymentStatus}
                    editingStatus={editingStatus}
                    isUpdatingPaymentStatus={isUpdatingPaymentStatus}
                    onCloseEditor={onCloseEditor}
                    onSelectStatus={onSelectStatus}
                    onToggleEditor={onToggleEditor}
                    onViewSignedDetail={onViewSignedDetail}
                    order={order}
                  />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className={styles.emptyState} colSpan="7">
                No hay pedidos que coincidan con los filtros aplicados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}
