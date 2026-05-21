
import styles from './Layout.module.css'

export default function Sidebar({ items = [] }) {
  return (

    <nav className={`nav d-flex flex-column align-items-start p-3 ${styles.sidebar}`}>
      
        <a className="nav-link" href="">Anuncios</a>
        <a className="nav-link" href="">Kanban</a>
        <hr />
        <a href="" className="nav-link"><i className="bi bi-person-fill fs-4 text-white m-2"></i>Itecsa</a>
    
    

    </nav>
  )
}