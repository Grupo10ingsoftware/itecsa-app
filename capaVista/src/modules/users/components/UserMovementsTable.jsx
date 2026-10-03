import { formatProfileDate } from '../../profile/utils/profileFormatters'
import styles from './UserMovementsModal.module.css'

export default function UserMovementsTable({ records, includeTime = false, label = 'Movimientos del usuario' }) {
  return <table className={styles.table} aria-label={label}>
    <thead><tr><th scope="col">Identificador</th><th scope="col">Detalle del movimiento</th><th scope="col">Fecha</th></tr></thead>
    <tbody>{records.map(record => <tr key={record.id}>
      <td data-label="Identificador">{record.id}</td>
      <td data-label="Detalle del movimiento">{record.detail}</td>
      <td data-label="Fecha"><time dateTime={record.dateTime}>{formatProfileDate(record.dateTime, { includeTime })}</time></td>
    </tr>)}</tbody>
  </table>
}
