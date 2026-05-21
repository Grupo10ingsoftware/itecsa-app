import Sidebar from './Sidebar'
import styles from './Layout.module.css'

function AppLayout() {
  return (
    <>
      <div className="container-fluid">
        <div className="row min-vh-100 ">
            <div className={`col-2 ${styles.sidebar}` }>
                <Sidebar/>

            </div>
            <div className="col-10 ">
                a
            </div>
            

        </div>
      </div>
    </>
  )
}

export default AppLayout
