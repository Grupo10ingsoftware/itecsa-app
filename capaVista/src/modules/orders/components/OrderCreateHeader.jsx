import styles from './OrderCreateHeader.module.css'

export default function OrderCreateHeader({ title = 'REGISTRO DE PEDIDO' }) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <span className={styles.sectionLabel}>Ventas</span>
        <h1 className={styles.pageTitle}>{title}</h1>
      </div>
    </header>
  )
}
