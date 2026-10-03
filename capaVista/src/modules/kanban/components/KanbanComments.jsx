import styles from '../styles/Kanban.module.css';
import { formatCommentDate } from '../utils/kanbanDetail.js';

export function KanbanComments({ commentGroups }) {
  return (
    <section className={styles.detailSection}>
      <h3>Comentarios</h3>
      <div className={styles.commentGroups}>
        <section className={styles.commentGroup} aria-label="Observaciones de Manager">
          <h4>Observaciones de Manager</h4>
          <ul className={styles.commentList}>
            {commentGroups.source.map((item) => (
              <li key={item.id}>
                <p>{item.text}</p>
              </li>
            ))}
            {commentGroups.source.length === 0 && (
              <li className={styles.emptyComment}>Esta produccion no tenia observaciones asociadas.</li>
            )}
          </ul>
        </section>

        <section className={styles.commentGroup} aria-label="Observaciones del sistema">
          <h4>Observaciones del sistema</h4>
          <ul className={styles.commentList}>
            {commentGroups.system.map((item) => (
              <li key={item.id}>
                <p>{item.text}</p>
                <time>{formatCommentDate(item.createdAt)}</time>
              </li>
            ))}
            {commentGroups.system.length === 0 && <li className={styles.emptyComment}>Sin observaciones del sistema.</li>}
          </ul>
        </section>

        <section className={styles.commentGroup} aria-label="Comentarios subprocesos">
          <h4>Comentarios subprocesos</h4>
          <ul className={styles.subprocessCommentList}>
            {commentGroups.subprocesses.map((item) => (
              <li key={item.id}>
                <strong>{item.subprocessName}</strong>
                <div>
                  <p>{item.text}</p>
                  <time>{formatCommentDate(item.createdAt)}</time>
                </div>
              </li>
            ))}
            {commentGroups.subprocesses.length === 0 && <li className={styles.emptyComment}>Sin comentarios de subprocesos.</li>}
          </ul>
        </section>
      </div>
    </section>
  )
}
