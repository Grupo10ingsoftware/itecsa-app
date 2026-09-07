import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useAuthApi } from '../../auth/hooks/useAuthApi'
import RoleBadge from '../../../shared/components/data/RoleBadge'
import styles from './ProfilePage.module.css'
import { formatProfileDate } from '../utils/profileFormatters'

function getDisplayValue(value, fallback = 'No informado') {
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
  const [profileData, setProfileData] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [profileAttempt, setProfileAttempt] = useState(0)
  useEffect(() => {
    let current = true
    authApi.getProfile().then((data) => {
      if (current) setProfileData({ subject: user?.sub, data })
    }).catch((error) => {
      if (current) setProfileError(error?.payload?.message ?? 'No fue posible cargar tu perfil.')
    })
    return () => { current = false }
  }, [authApi, user?.sub, profileAttempt])
  const loadedProfile = profileData?.subject === user?.sub ? profileData?.data : null
  const [visiblePin, setVisiblePin] = useState('')
  const [pinError, setPinError] = useState('')
  const [isPinBusy, setIsPinBusy] = useState(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [recoveryRequested, setRecoveryRequested] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState('')
  const profile = useMemo(() => {
    const firstName = loadedProfile?.primerNombre ?? user?.primerNombre
    const lastName = loadedProfile?.apellidoPaterno ?? user?.apellidoPaterno
    const email = loadedProfile?.email ?? user?.email
    const role = loadedProfile?.rolUsuario ?? user?.rolUsuario
    const status = loadedProfile?.estadoUsuario

    return {
      firstName,
      lastName,
      email,
      role,
      status,
      rut: loadedProfile?.rutUsuario,
      picture: auth0User?.picture,
      initials: getInitials(firstName, lastName, email),
    }
  }, [auth0User, user, loadedProfile])

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

        {profileError ? (
          <div className="alert alert-danger" role="alert">
            {profileError}{' '}
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => {
              setProfileError('')
              setProfileAttempt((attempt) => attempt + 1)
            }}>Reintentar</button>
          </div>
        ) : !loadedProfile && <p role="status">Cargando perfil...</p>}

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
                <span className={styles.sectionLabel}>Información personal</span>
                <h2>{getDisplayValue(`${getDisplayValue(profile.firstName, '')} ${getDisplayValue(profile.lastName, '')}`.trim(), 'Usuario sin nombre')}</h2>
              </div>
              <span className={styles.statusBadge}>{getDisplayValue(profile.status)}</span>
            </div>

            <dl className={styles.infoList}>
              <div>
                <dt>Primer nombre</dt>
                <dd>{getDisplayValue(profile.firstName)}</dd>
              </div>
              <div>
                <dt>Apellido paterno</dt>
                <dd>{getDisplayValue(profile.lastName)}</dd>
              </div>
              <div>
                <dt>Rut</dt>
                <dd>{getDisplayValue(profile.rut)}</dd>
              </div>
              <div>
                <dt>Correo electrónico</dt>
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
                <dd>{getDisplayValue(profile.status)}</dd>
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
            <h2 id="movements-title">Últimos diez registros</h2>
          </header>

          {loadedProfile?.records.length === 0 && <p role="status">Aún no tienes registros asociados.</p>}
          <div className={styles.movementsTable} role="table" aria-label="Últimos registros del usuario">
            <div className={styles.movementsHead} role="row">
              <span role="columnheader">Identificador</span>
              <span role="columnheader">Detalle del movimiento</span>
              <span role="columnheader">Fecha</span>
            </div>
            {(loadedProfile?.records ?? []).map((movement) => (
              <div className={styles.movementRow} key={movement.id} role="row">
                <span role="cell">{movement.id}</span>
                <span role="cell">{movement.detail}</span>
                <time dateTime={movement.dateTime} role="cell">
                  {formatProfileDate(movement.dateTime)}
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
