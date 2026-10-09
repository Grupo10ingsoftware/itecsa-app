import styles from '../pages/PrivacyPages.module.css'

export default function PrivacyPageHeader({ eyebrow, title, children }) {
  return <header className={styles.hero}>
    <span className={styles.eyebrow}>{eyebrow}</span>
    <h1>{title}</h1>
    <div className={styles.introduction}>{children}</div>
  </header>
}
