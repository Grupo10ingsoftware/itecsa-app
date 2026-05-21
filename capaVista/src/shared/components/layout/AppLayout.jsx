import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import styles from './Layout.module.css'

function AppLayout() {
  return (
    <div className="container-fluid">
      <div className="row min-vh-100">
        <div className={`col-2 ${styles.sidebar}`}>
          <Sidebar />
        </div>
        <main className="col-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
