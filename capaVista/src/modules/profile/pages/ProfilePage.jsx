import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useAuthApi } from '../../auth/hooks/useAuthApi'
import RoleBadge from '../../../shared/components/data/RoleBadge'
import styles from './ProfilePage.module.css'

const MOCK_MOVEMENTS = Object.freeze([
  {
    id: 'profile-movement-1',
    action: 'Completo el subproceso Impresion del pedido Pedido6.',
    dateTime: '2026-08-05 11:45',
  },
  {
    id: 'profile-movement-2',
    action: 'Registro una observacion operativa en el pedido Pedido6.',
    dateTime: '2026-08-05 11:48',
  },
  {
    id: 'profile-movement-3',
    action: 'Valido una desvinculacion desde Gestion de usuarios.',
    dateTime: '2026-08-05 12:10',
  },
])

function getDisplayValue(value, fallback = 'Pendiente de backend') {
  return String(value ?? '').trim() || fallback
}

function getInitials(firstName, lastName, email) {
  const firstInitial = String(firstName ?? '').trim().charAt(0)
  const lastInitial = String(lastName ?? '').trim().charAt(0)
  const emailInitial = String(email ?? '').trim().charAt(0)

  return `${firstInitial}${lastInitial}`.trim().toUpperCase() || emailInitial.toUpperCase() || 'U'
}

export default function ProfilePage() {
  const { auth0User, pinStatus, refreshSession, user } = useAuth()
  const authApi = useAuthApi()
  const [visiblePin, setVisiblePin] = useState('')
  const [pinError, setPinError] = useState('')
  const [isPinBusy, setIsPinBusy] = useState(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [recoveryRequested, setRecoveryRequested] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState('')
  const profile = useMemo(() => {
    const firstName = user?.nombreUsuario ?? user?.primerNombre ?? auth0User?.given_name ?? auth0User?.name
    const lastName = user?.apellidoUsuario ?? user?.apellidoPaterno ?? auth0User?.family_name ?? ''
    const email = user?.correoUsuario ?? user?.email ?? auth0User?.email
    const role = user?.rolUsuario ?? user?.role
    const status = user?.estadoUsuario ?? 'Vinculado'

    return {
      firstName,
      lastName,
      email,
      role,
      status,
      rut: user?.rutUsuario,
      picture: auth0User?.picture,
      initials: getInitials(firstName, lastName, email),
    }
  }, [auth0User, user])

  useEffect(() => {
    if (pinStatus !== 'pending_acknowledgement' || visiblePin) return

    let current = true
    authApi.revealPin()
      .then(({ pin }) => {
        if (current) { setPinError(''); setVisiblePin(pin) }
      })
      .catch((error) => {
        if (current) setPinError(error?.payload?.message ?? 'No fue posible mostrar el PIN.')
      })

    return () => {
      current = false
    }
  }, [authApi, pinStatus, visiblePin])

  async function acknowledgePin() {
    setIsPinBusy(true)
    setPinError('')

    try {
      await authApi.acknowledgePin()
      setVisiblePin('')
      await refreshSession()
    } catch (error) {
      setPinError(error?.payload?.message ?? 'No fue posible confirmar la recepcion del PIN.')
    } finally {
      setIsPinBusy(false)
    }
  }

  async function requestRecovery() {
    setIsPinBusy(true)
    setPinError('')

    try {
      await authApi.requestPinRecovery()
      setRecoveryRequested(true)
    } catch (error) {
      setPinError(error?.payload?.message ?? 'No fue posible enviar el codigo de recuperacion.')
    } finally {
      setIsPinBusy(false)
    }
  }

  async function confirmRecovery(event) {
    event.preventDefault()
    setIsPinBusy(true)
    setPinError('')

    try {
      await authApi.confirmPinRecovery(recoveryCode)
      const { pin } = await authApi.revealPin()
      setVisiblePin(pin)
      setRecoveryOpen(false)
      setRecoveryRequested(false)
      setRecoveryCode('')
      await refreshSession()
    } catch (error) {
      setPinError(error?.payload?.message ?? 'No fue posible validar el codigo.')
    } finally {
      setIsPinBusy(false)
    }
  }

  return (
    <main className={`container-fluid ${styles.page}`} aria-labelledby="profile-title">
      <section className={styles.shell}>
        <header className={styles.header}>
          <span className={styles.sectionLabel}>Usuario</span>
          <h1 className={styles.pageTitle} id="profile-title">
            Mi perfil
          </h1>
        </header>

        <section className={styles.profileGrid} aria-label="Datos del usuario">
          <aside className={styles.photoPanel}>
            {profile.picture ? (
              <img alt="" className={styles.profilePhoto} src={profile.picture} />
            ) : (
              <div className={styles.profilePhotoFallback} aria-hidden="true">
                {profile.initials}
              </div>
            )}
          </aside>

          <div className={styles.infoPanel}>
            <div className={styles.infoHeader}>
              <div>
                <span className={styles.sectionLabel}>Informacion ingresada</span>
                <h2>{getDisplayValue(`${getDisplayValue(profile.firstName, '')} ${getDisplayValue(profile.lastName, '')}`.trim(), 'Usuario sin nombre')}</h2>
              </div>
              <span className={styles.statusBadge}>{getDisplayValue(profile.status, 'Vinculado')}</span>
            </div>

            <dl className={styles.infoList}>
              <div>
                <dt>Nombres</dt>
                <dd>{getDisplayValue(profile.firstName)}</dd>
              </div>
              <div>
                <dt>Apellidos</dt>
                <dd>{getDisplayValue(profile.lastName)}</dd>
              </div>
              <div>
                <dt>Rut</dt>
                <dd>{getDisplayValue(profile.rut)}</dd>
              </div>
              <div>
                <dt>Correo electronico</dt>
                <dd>{getDisplayValue(profile.email)}</dd>
              </div>
              <div>
                <dt>Rol</dt>
                <dd>
                  <RoleBadge role={profile.role} />
                </dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{getDisplayValue(profile.status, 'Vinculado')}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="card border-0 shadow-sm mb-4" aria-labelledby="personal-pin-title">
          <div className="card-body d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <span className={styles.sectionLabel}>Seguridad</span>
              <h2 className="h5 mb-1" id="personal-pin-title">PIN personal</h2>
              <p className="mb-0 text-secondary">
                {pinStatus === 'active' ? 'Aceptado' : 'Pendiente de entrega'}
              </p>
            </div>
            {pinStatus === 'active' && (
              <button
                className="btn btn-outline-dark"
                onClick={() => {
                  setRecoveryOpen(true)
                  setPinError('')
                }}
                type="button"
              >
                Recuperar PIN
              </button>
            )}
          </div>
        </section>

        <section className={styles.movementsPanel} aria-labelledby="movements-title">
          <header className={styles.movementsHeader}>
            <span className={styles.sectionLabel}>Actividad</span>
            <h2 id="movements-title">Ultimo movimiento</h2>
          </header>

          <div className={styles.movementsTable} role="table" aria-label="Ultimos movimientos del usuario">
            <div className={styles.movementsHead} role="row">
              <span role="columnheader">Movimiento</span>
              <span role="columnheader">Fecha y hora</span>
            </div>
            {MOCK_MOVEMENTS.map((movement) => (
              <div className={styles.movementRow} key={movement.id} role="row">
                <span role="cell">{movement.action}</span>
                <time dateTime={movement.dateTime} role="cell">
                  {movement.dateTime}
                </time>
              </div>
            ))}
          </div>
        </section>
      </section>

      {pinStatus === 'pending_acknowledgement' && (
        <>
          <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="pin-delivery-title">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h2 className="modal-title fs-5" id="pin-delivery-title">Tu PIN personal</h2>
                </div>
                <div className="modal-body text-center">
                  <p>Guardalo en un lugar seguro. Despues de aceptar no volvera a mostrarse.</p>
                  <div className="display-5 fw-bold font-monospace" aria-live="polite">
                    {visiblePin || '------'}
                  </div>
                  {pinError && <div className="alert alert-danger mt-3 mb-0">{pinError}</div>}
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-dark"
                    disabled={!visiblePin || isPinBusy}
                    onClick={acknowledgePin}
                    type="button"
                  >
                    {isPinBusy ? 'Guardando...' : 'Aceptar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show" />
        </>
      )}

      {recoveryOpen && pinStatus === 'active' && (
        <>
          <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="pin-recovery-title">
            <div className="modal-dialog modal-dialog-centered">
              <form className="modal-content" onSubmit={confirmRecovery}>
                <div className="modal-header">
                  <h2 className="modal-title fs-5" id="pin-recovery-title">Recuperar PIN</h2>
                  <button
                    aria-label="Cerrar"
                    className="btn-close"
                    disabled={isPinBusy}
                    onClick={() => setRecoveryOpen(false)}
                    type="button"
                  />
                </div>
                <div className="modal-body">
                  {!recoveryRequested ? (
                    <p>
                      En desarrollo el codigo temporal se registra en la consola del backend.
                    </p>
                  ) : (
                    <label className="form-label w-100">
                      Codigo de verificacion
                      <input
                        className="form-control font-monospace"
                        inputMode="numeric"
                        maxLength={6}
                        onChange={(event) => setRecoveryCode(event.target.value.replace(/\D/g, ''))}
                        required
                        value={recoveryCode}
                      />
                    </label>
                  )}
                  {pinError && <div className="alert alert-danger mb-0">{pinError}</div>}
                </div>
                <div className="modal-footer">
                  {!recoveryRequested ? (
                    <button
                      className="btn btn-dark"
                      disabled={isPinBusy}
                      onClick={requestRecovery}
                      type="button"
                    >
                      Generar codigo
                    </button>
                  ) : (
                    <button
                      className="btn btn-dark"
                      disabled={isPinBusy || recoveryCode.length !== 6}
                      type="submit"
                    >
                      Validar codigo
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
          <div className="modal-backdrop show" />
        </>
      )}
    </main>
  )
}
