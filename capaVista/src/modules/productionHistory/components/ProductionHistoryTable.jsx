import ProductionHistoryRow from './ProductionHistoryRow'
import styles from './ProductionHistoryTable.module.css'

export default function ProductionHistoryTable({ orders }) {
  return (
    <section className={styles.tableWrap} aria-label="Pedidos con historial de produccion">
      <table className={`table table-hover align-middle mb-0 ${styles.historyTable}`}>
        <colgroup>
          <col className={styles.colOrder} />
          <col className={styles.colProduct} />
          <col className={styles.colClient} />
          <col className={styles.colSeller} />
          <col className={styles.colStatus} />
          <col className={styles.colSamples} />
          <col className={styles.colActions} />
        </colgroup>
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Producto</th>
            <th>Cliente</th>
            <th>Vendedor</th>
            <th>Estado</th>
            <th>Muestras</th>
            <th className={styles.actionsColumn}>Accion</th>
          </tr>
        </thead>
        <tbody>
          {orders.length > 0 ? (
            orders.map((order) => <ProductionHistoryRow key={order.id} order={order} />)
          ) : (
            <tr>
              <td className={styles.emptyState} colSpan="7">
                No hay pedidos que coincidan con la busqueda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}
