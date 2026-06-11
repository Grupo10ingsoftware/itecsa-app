import React, { useState } from 'react';
import styles from './styles/OrderDetail.module.css';
import {useAuth0} from "@auth0/auth0-react";

const OrderDetail = ({ order, onUpdateOrder }) => {
    const { user, isAuthenticated } = useAuth0();
    if (!order) return null;

    const { clientName, nv, product, date, isUrgent, isDelayed, subProcesses = [], comments = [] } = order;

    const [editingProcess, setEditingProcess] = useState(null);
    const [newComment, setNewComment] = useState("");

    const handleStatusChange = (processId, newStatus) => {
        if (!newComment.trim()) {
            alert("Por favor, ingresa un comentario justificando el cambio de estado.");
            return;
        }

        const updatedSubProcesses = subProcesses.map(proc => 
            proc.id === processId ? { ...proc, status: newStatus } : proc
        );

        const exactTimestamp = new Date().toLocalString('es-CL', {
             day: '2-digit', month: '2-digit', year: 'numeric',
             hour: '2-digit', minute: '2-digit'}
        );

        const currentUser = isAuthenticated && user ? (user.name || user.email ) : "Usuario del sistema";
        const newCommentObj = {
            author: "Operario", 
            date: new Date().toLocaleDateString('es-CL'),
            text: `Actualizó "${editingProcess.name}": ${newComment}`
        };

        onUpdateOrder({
            ...order,
            subProcesses: updatedSubProcesses,
            comments: [newCommentObj, ...comments]
        });

        setEditingProcess(null);
        setNewComment("");
    };

    return (
        <div className={styles.detailsContainer}>
            
            <h6 className={styles.sectionTitle}>Datos Comerciales</h6>
            <div className="d-flex flex-column gap-1 mb-3">
                <div className={styles.dataItem}><span className={styles.label}>Cliente:</span><span className={styles.value}>{clientName}</span></div>
                <div className={styles.dataItem}><span className={styles.label}>NV:</span><span className={styles.value}>{nv}</span></div>
                <div className={styles.dataItem}><span className={styles.label}>Producto:</span><span className={styles.value}>{product}</span></div>
                <div className={styles.dataItem}><span className={styles.label}>Fecha:</span><span className={styles.value}>{date}</span></div>
            </div>

            <h6 className={styles.sectionTitle}>Etiquetas de Prioridad</h6>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button 
                    className={styles.btnPrimary}
                    style={{ backgroundColor: isUrgent ? '#dc2626' : '#000', borderColor: isUrgent ? '#dc2626' : '#000', color: '#fff', flex: 1 }}
                    onClick={() => onUpdateOrder({ ...order, isUrgent: !isUrgent })}
                >
                    {isUrgent ? 'Quitar Urgencia' : 'Marcar Urgente'}
                </button>
                <button 
                    className={styles.btnPrimary}
                    style={{ backgroundColor: isDelayed ? '#ca8a04' : '#000', borderColor: isDelayed ? '#ca8a04' : '#000', color: '#fff', flex: 1 }}
                    onClick={() => onUpdateOrder({ ...order, isDelayed: !isDelayed })}
                >
                    {isDelayed ? 'Quitar Atraso' : 'Marcar Atraso'}
                </button>
            </div>

<h6 className={styles.sectionTitle}>Producción y Avance</h6>
            <div className="d-flex flex-column gap-1 mb-3">
                {subProcesses.map((proc, index) => {
                    const isLocked = index > 0 && subProcesses[index - 1].status !== 'completed';

                    return (
                        <div 
                            key={proc.id} 
                            className={`${styles.processItem} ${editingProcess?.id === proc.id ? styles.processEditing : ''} ${isLocked ? styles.processLocked : ''}`}
                            onClick={() => {
                                if (isLocked) {
                                    alert(`Acción inválida. No puedes iniciar "${proc.name}" porque la etapa de "${subProcesses[index - 1].name}" aún no ha sido finalizada.`);
                                    return;
                                }
                                setEditingProcess(proc);
                            }}
                            title={isLocked ? "Etapa bloqueada por dependencia" : "Clic para cambiar estado"}
                        >
                            <div className="d-flex align-items-center gap-2">
                                {isLocked ? (
                                    <i className="bi bi-lock-fill text-muted" style={{fontSize: '0.85rem'}}></i>
                                ) : (
                                    <span className={`${styles.statusCircle} ${proc.status === 'completed' ? 'bg-success' : proc.status === 'in_progress' ? 'bg-warning' : 'bg-secondary'}`}></span>
                                )}
                                <span className={`${styles.text08} fw-bold ${isLocked ? 'text-muted' : 'text-dark'}`}>{proc.name}</span>
                            </div>
                            <span className={`small fw-bold ${proc.status === 'completed' ? 'text-success' : proc.status === 'in_progress' ? 'text-warning' : 'text-muted'}`} style={{fontSize: '0.7rem'}}>
                                {proc.status === 'completed' ? 'Hecho' : proc.status === 'in_progress' ? 'En curso' : 'Pendiente'}
                            </span>
                        </div>
                    );
                })}
            </div>
            {editingProcess && (
                <div className="p-3 mb-3 border rounded bg-light">
                    <p className="fw-bold mb-2" style={{fontSize: '0.8rem'}}>Cambiar estado de: {editingProcess.name}</p>
                    <select 
                        className="form-select form-select-sm mb-2"
                        defaultValue={editingProcess.status}
                        onChange={(e) => editingProcess.tempStatus = e.target.value}
                    >
                        <option value="pending">Pendiente</option>
                        <option value="in_progress">En curso</option>
                        <option value="completed">Hecho</option>
                    </select>
                    <textarea 
                        className="form-control form-control-sm mb-2" 
                        placeholder="Motivo del cambio (obligatorio)..."
                        rows="2"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                    ></textarea>
                    <div className="d-flex gap-2 mt-2">
                        <button 
                            className="btn btn-sm btn-dark flex-grow-1" 
                            onClick={() => handleStatusChange(editingProcess.id, editingProcess.tempStatus || editingProcess.status)}
                        >
                            Guardar
                        </button>
                        <button 
                            className="btn btn-sm btn-outline-secondary" 
                            onClick={() => setEditingProcess(null)}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            <h6 className={styles.sectionTitle}>Historial</h6>
            <div className={styles.commentsScroll}>
                {comments.length > 0 ? (
                    comments.map((c, i) => (
                        <div key={i} className={styles.commentBubble}>
                            <div className="d-flex justify-content-between mb-1 fw-bold text-dark" style={{fontSize: '0.7rem'}}>
                                <span>{c.author}</span>
                                <span className="text-muted">{c.date}</span>
                            </div>
                            <p className="mb-0 text-secondary" style={{lineHeight: '1.2', fontSize: '0.75rem'}}>{c.text}</p>
                        </div>
                    ))
                ) : (
                    <p className="text-muted small text-center mt-2">No hay movimientos registrados.</p>
                )}
            </div>

        </div>
    );
};

export default OrderDetail;