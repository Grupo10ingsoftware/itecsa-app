import { useEffect, useRef, useState } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { APP_ROUTES } from '../../../config/routes'
import { popupPreview } from '../utils/popupNotifications'
import styles from './MessagePopup.module.css'

export default function MessagePopup({ message, onDismiss }) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [paused, setPaused] = useState(false)
  const soundRef = useRef(null)

  useEffect(() => {
    function unlockSound() {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      try {
        soundRef.current ??= new AudioContext()
        void soundRef.current.resume().catch(() => {})
      } catch { /* El aviso visual funciona aunque el navegador bloquee el audio. */ }
    }
    document.addEventListener('pointerdown', unlockSound)
    document.addEventListener('keydown', unlockSound)
    return () => {
      document.removeEventListener('pointerdown', unlockSound)
      document.removeEventListener('keydown', unlockSound)
      void soundRef.current?.close().catch(() => {})
      soundRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!message) return
    // Precarga la ruta mientras se visualiza el aviso, sin bloquear la navegación.
    void import('../pages/MessageInboxPage').catch(() => {})
    const context = soundRef.current
    if (!context || context.state !== 'running') return
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.frequency.setValueAtTime(880, context.currentTime)
    oscillator.frequency.setValueAtTime(1174, context.currentTime + 0.1)
    gain.gain.setValueAtTime(0, context.currentTime)
    gain.gain.linearRampToValueAtTime(0.06, context.currentTime + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.28)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.3)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
  }, [message])

  useEffect(() => {
    if (!message || confirming || paused) return
    const timer = window.setTimeout(onDismiss, 8000)
    return () => window.clearTimeout(timer)
  }, [message, confirming, paused, onDismiss])

  return <>
    <div aria-live="polite" aria-atomic="true" className={styles.liveRegion}>
      {message && <aside className={styles.popup} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) }}>
        <button className={styles.main} onClick={() => setConfirming(true)} type="button">
          <span className={styles.icon}><i className="bi bi-chat-dots-fill" aria-hidden="true" /></span>
          <span className={styles.copy}>
            <span className={styles.meta}>MENSAJES <span>ahora</span></span>
            <strong>Nuevo mensaje</strong>
            <span>{popupPreview(message.contenido)}</span>
          </span>
        </button>
        <button aria-label="Cerrar aviso" className={styles.close} onClick={onDismiss} type="button"><i className="bi bi-x" aria-hidden="true" /></button>
      </aside>}
    </div>
    <Modal show={confirming} onHide={() => setConfirming(false)} centered aria-labelledby="message-popup-title">
      <Modal.Header closeButton><Modal.Title id="message-popup-title">Abrir bandeja de mensajes</Modal.Title></Modal.Header>
      <Modal.Body>¿Quieres ir a la bandeja de mensajes para leer el mensaje completo?</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setConfirming(false)}>Cancelar</Button>
        <Button variant="primary" onClick={() => { setConfirming(false); onDismiss(); navigate(APP_ROUTES.MESSAGES) }}>Ir a la bandeja</Button>
      </Modal.Footer>
    </Modal>
  </>
}
