import LogoutButton from '../../../modules/auth/components/LogoutButton'
import NavigationMenu from '../navigation/NavigationMenu'
import styles from './Layout.module.css'

export default function Sidebar() {
  return (
    <nav className={`nav d-flex flex-column align-items-start p-3 ${styles.sidebarNav}`}>
      <div className="w-100">
        <NavigationMenu />
      </div>

      <div className={styles.sidebarFooter}>
        <LogoutButton />
      </div>
    </nav>
  )
}