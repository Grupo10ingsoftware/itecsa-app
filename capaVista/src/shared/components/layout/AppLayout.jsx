import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import styles from './Layout.module.css'

function AppLayout() {
  return (
    <div className="container-fluid">
      <div className="row min-vh-100">
        <div className={`col-2 ${styles.sidebar}`}>
          <Sidebar />
        </div>
        <div className="col-10 px-0">
          <Topbar />
          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default AppLayout
