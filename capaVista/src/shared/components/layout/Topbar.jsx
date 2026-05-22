import LogoutButton from '../../../modules/auth/components/LogoutButton'
import ProfileSummary from '../../../modules/profile/components/ProfileSummary'
import styles from './Layout.module.css'

export default function Topbar() {
  return (
    <header className={`d-flex align-items-center justify-content-end gap-3 px-4 py-3 ${styles.topbar}`}>
      <ProfileSummary />
      <LogoutButton />
    </header>
  )
}
