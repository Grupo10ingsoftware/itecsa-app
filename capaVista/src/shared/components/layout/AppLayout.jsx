import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import styles from './Layout.module.css'

function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  function handleToggleSidebar() {
    setIsSidebarCollapsed((currentValue) => !currentValue)
  }

  function handleOpenMobileSidebar() {
    setIsMobileSidebarOpen(true)
  }

  function handleCloseMobileSidebar() {
    setIsMobileSidebarOpen(false)
  }

  return (
    <div className={styles.appShell}>
      <aside
        className={`
          ${styles.sidebar}
          ${isSidebarCollapsed ? styles.sidebarCollapsed : ''}
          ${isMobileSidebarOpen ? styles.sidebarMobileOpen : ''}
        `}
      >
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onCloseMobile={handleCloseMobileSidebar}
          onToggleCollapse={handleToggleSidebar}
        />
      </aside>

      {isMobileSidebarOpen && (
        <button
          aria-label="Cerrar menú lateral"
          className={styles.mobileBackdrop}
          onClick={handleCloseMobileSidebar}
          type="button"
        />
      )}

      <section
        className={`
          ${styles.contentArea}
          ${isSidebarCollapsed ? styles.contentAreaSidebarCollapsed : ''}
        `}
      >
        <Topbar onOpenMobileSidebar={handleOpenMobileSidebar} />
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </section>
    </div>
  )
}

export default AppLayout
