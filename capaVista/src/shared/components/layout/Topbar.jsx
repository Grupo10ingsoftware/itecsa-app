import { useState } from 'react'
import ProfileSummary from '../../../modules/profile/components/ProfileSummary'
import NotificationBell from '../../../modules/messages/components/NotificationBell'
import styles from './Layout.module.css'

export default function Topbar({ onOpenMobileSidebar }) {
  const [popupContainer, setPopupContainer] = useState(null)
  return (
    <header className={styles.topbar}>
      <button
        aria-label="Abrir menú lateral"
        className={styles.mobileMenuButton}
        onClick={onOpenMobileSidebar}
        type="button"
      >
        <i className="bi bi-list" aria-hidden="true" />
      </button>

      <div className={styles.topbarSpacer} ref={setPopupContainer} />
      <NotificationBell popupContainer={popupContainer} />
      <div className={styles.topbarProfile}>
        <ProfileSummary />
      </div>
    </header>
  )
}
