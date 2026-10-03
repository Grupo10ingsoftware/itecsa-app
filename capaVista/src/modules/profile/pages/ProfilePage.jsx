import { useEffect, useMemo, useState } from 'react'
import { ROLES } from '../../../config/roles'
import { useAuth } from '../../../hooks/useAuth'
import { useAuthApi } from '../../auth/hooks/useAuthApi'
import RoleBadge from '../../../shared/components/data/RoleBadge'
import styles from './ProfilePage.module.css'
import { formatProfileDate } from '../utils/profileFormatters'
import { displayUserStatus, isActiveUserStatus } from '../../../config/userLifecycle'
import UserMovementsModal from '../../users/components/UserMovementsModal'
import UserMovementsTable from '../../users/components/UserMovementsTable'
import confirmationStyles from '../../../shared/styles/ConfirmationModal.module.css'

function getDisplayValue(value, fallback = 'No informado') {
  return String(value ?? '').trim() || fallback
}

export default function ProfilePage() {
  const { auth0User, pinStatus, refreshSession, user } = useAuth()
  const authApi = useAuthApi()
  const [historyOpen, setHistoryOpen] = useState(false)
  const historyApi = useMemo(() => ({ getMovements: (_subject, query) => authApi.getProfileMovements(query) }), [authApi])
  const historyUser = { idUsuarioAutenticacionExterna: user?.sub }
  const [profileData, setProfileData] = useState(null)
  const [profileAttempt, setProfileAttempt] = useState(0)
  useEffect(() => {
    let current = true
    authApi.getProfile().then((data) => {
      if (current) setProfileData({ subject: user?.sub, api: authApi, attempt: profileAttempt, data })
    }).catch((error) => {
      if (current) setProfileData({ subject: user?.sub, api: authApi, attempt: profileAttempt,
        error: error?.payload?.message ?? 'No fue posible cargar tu perfil.' })
    })
    return () => { current = false }
  }, [authApi, user?.sub, profileAttempt])
  const profileCurrent = profileData?.subject === user?.sub && profileData?.api === authApi && profileData?.attempt === profileAttempt
  const loadedProfile = profileCurrent ? profileData?.data : null
  const profileError = profileCurrent ? profileData?.error : ''
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
    const status = loadedProfile?.estadoUsuario ?? user?.estadoUsuario

    return {
      firstName,
      lastName,
      email,
      role,
      status,
      rut: loadedProfile?.rutUsuario ?? user?.rutUsuario,
      picture: auth0User?.picture,
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

  async function debugResetPin() {
    setIsPinBusy(true)
    setPinError('')
    setVisiblePin('')
    try {
      await authApi.debugResetPin()
      await refreshSession()
    } catch (error) {
      setPinError(error?.payload?.message ?? 'No fue posible generar el PIN.')
    } finally {
      setIsPinBusy(false)
    }
  }

  function resetRecovery() {
    setRecoveryRequested(false)
    setRecoveryCode('')
    setPinError('')
  }

  function closeRecovery() {
    setRecoveryOpen(false)
    resetRecovery()
  }

  async function requestRecovery() {
    setIsPinBusy(true)
    setPinError('')

    try {
      await authApi.requestPinRecovery()
      setRecoveryCode('')
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
      if (['PIN_RECOVERY_CODE_EXPIRED', 'PIN_RECOVERY_ATTEMPTS_EXHAUSTED'].includes(error?.payload?.code)) {
        setRecoveryRequested(false)
        setRecoveryCode('')
      }
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
          <p>Revisa tu información personal y la actividad reciente de tu cuenta.</p>
        </header>

        {profileError && (
          <div className="alert alert-danger" role="alert">
            {profileError}{' '}
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => {
              setProfileAttempt((attempt) => attempt + 1)
            }}>Reintentar</button>
          </div>
        )}

        <section className={styles.profileGrid} aria-label="Datos del usuario">
          <aside className={styles.photoPanel}>
            <div className={styles.identityBlock}>
            {profile.picture ? <img alt="" className={styles.profilePhoto} src={profile.picture} />
              : <div className={styles.profilePhotoFallback} aria-hidden="true"><i className="bi bi-person" /></div>}
            <h2>{getDisplayValue(`${getDisplayValue(profile.firstName, '')} ${getDisplayValue(profile.lastName, '')}`.trim(), 'Usuario sin nombre')}</h2>
            </div>
            <div className={styles.roleBlock}>
              <div className={styles.roleContent}>
              <span className={styles.cardIcon}><i className="bi bi-briefcase" aria-hidden="true" /></span>
              <div><h3>Rol del usuario</h3><RoleBadge role={profile.role} /></div>
              </div>
            </div>
          </aside>

          <section className={styles.infoPanel} aria-labelledby="personal-information-title">
            <header className={styles.cardHeader}>
              <span className={styles.cardIcon}><i className="bi bi-person" aria-hidden="true" /></span>
              <div><h2 id="personal-information-title">Información personal</h2><p>Estos son los datos asociados a tu cuenta en ItecsaApp.</p></div>
            </header>
            <dl className={styles.infoList}>
              <div><dt>Primer nombre</dt><dd>{getDisplayValue(profile.firstName)}</dd></div>
              <div><dt>Apellido paterno</dt><dd>{getDisplayValue(profile.lastName)}</dd></div>
              <div><dt>RUT</dt><dd>{getDisplayValue(profile.rut)}</dd></div>
              <div><dt>Correo electrónico</dt><dd>{getDisplayValue(profile.email)}</dd></div>
              <div><dt>Estado</dt><dd><span className={`${styles.statusBadge} ${isActiveUserStatus(profile.status) ? styles.accepted : styles.neutral}`}>
                <i className="bi bi-circle-fill" aria-hidden="true" />{getDisplayValue(displayUserStatus(profile.status))}
              </span></dd></div>
              <div><dt>Fecha de registro</dt><dd>{loadedProfile?.fechaRegistro ? formatProfileDate(loadedProfile.fechaRegistro, { includeTime: true }) : 'No informada'}</dd></div>
            </dl>
          </section>

          <section className={styles.pinPanel} aria-labelledby="personal-pin-title">
            <header className={styles.cardHeader}>
              <span className={styles.cardIcon}><i className="bi bi-shield" aria-hidden="true" /></span>
              <div><h2 id="personal-pin-title">PIN personal</h2><p>Utiliza tu PIN para confirmar acciones sensibles en la plataforma.</p></div>
            </header>
            <div className={styles.pinState}>
              <span className={`${styles.pinIcon} ${pinStatus === 'active' ? styles.accepted : styles.pending}`}><i className={`bi ${pinStatus === 'active' ? 'bi-lock' : 'bi-shield-lock'}`} aria-hidden="true" /></span>
              <span className={`${styles.statusBadge} ${pinStatus === 'active' ? styles.accepted : styles.pending}`}>
                <i className="bi bi-circle-fill" aria-hidden="true" />{pinStatus === 'active' ? 'Aceptado' : 'Pendiente de entrega'}
              </span>
            </div>
            {pinStatus === 'active' && <button className={styles.outlineButton} disabled={isPinBusy} type="button"
              onClick={() => { resetRecovery(); setRecoveryOpen(true) }}><i className="bi bi-arrow-clockwise" aria-hidden="true" />Recuperar PIN</button>}
            {import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_ROUTES === 'true' && profile.role === ROLES.SOPORTE && pinStatus === 'active' && <div>
              <button className={styles.outlineButton} type="button" disabled={isPinBusy} onClick={debugResetPin}>
                {isPinBusy ? 'Generando...' : 'Generar nuevo PIN (debug)'}
              </button><p className={styles.debugHint}>El PIN anterior dejará de funcionar.</p>
            </div>}
          </section>
        </section>

        {pinError && pinStatus === 'active' && !recoveryOpen && <div className="alert alert-danger" role="alert">{pinError}</div>}

        <section className={styles.movementsPanel} aria-labelledby="movements-title">
          <header className={styles.movementsHeader}>
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}><i className="bi bi-clock" aria-hidden="true" /></span>
              <div><h2 id="movements-title">Actividad reciente</h2><p>Últimos movimientos y cambios realizados en tu cuenta.</p></div>
            </div>
            <button className={styles.outlineButton} type="button" disabled={!loadedProfile || pinStatus !== 'active'}
              onClick={() => setHistoryOpen(true)}><i className="bi bi-calendar3" aria-hidden="true" />Ver historial completo</button>
          </header>
          {!loadedProfile ? <p role="status">{profileError ? 'Actividad no disponible.' : 'Cargando actividad…'}</p>
            : !loadedProfile.records?.length ? <p role="status">Aún no tienes registros asociados.</p>
              : <UserMovementsTable records={loadedProfile.records} label="Actividad reciente del usuario" />}
        </section>
      </section>

      {historyOpen && pinStatus === 'active' && <UserMovementsModal key={user?.sub}
        user={historyUser} api={historyApi} onClose={() => setHistoryOpen(false)} title="Historial completo"
        description="Consulta el registro completo de movimientos de tu cuenta." />}

      {pinStatus === 'pending_acknowledgement' && (
        <>
          <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="pin-delivery-title">
            <div className="modal-dialog modal-dialog-centered">
              <div className={`modal-content ${confirmationStyles.content}`}>
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
              <form className={`modal-content ${confirmationStyles.content}`} onSubmit={confirmRecovery}>
                <div className="modal-header">
                  <h2 className="modal-title fs-5" id="pin-recovery-title">Recuperar PIN</h2>
                  <button
                    aria-label="Cerrar"
                    className="btn-close"
                    disabled={isPinBusy}
                    onClick={closeRecovery}
                    type="button"
                  />
                </div>
                <div className="modal-body">
                  {!recoveryRequested ? (
                    <p>
                      Solicita un codigo de verificacion en tu correo para generar un nuevo PIN.
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
                  <button className="btn btn-outline-secondary" disabled={isPinBusy} onClick={closeRecovery} type="button">
                    Cancelar
                  </button>
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
