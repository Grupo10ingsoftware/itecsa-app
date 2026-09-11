import { useCallback, useEffect, useRef, useState } from 'react'
import { API_ERROR_CODES } from '../../../services/api/apiClient'
import { useAuth } from '../../../hooks/useAuth'
import { useAdminUsersApi } from '../hooks/useAdminUsersApi'
import UserButton from '../components/UserButton'
import UserCreateModal from '../components/UserCreateModal'
import UserEditModal from '../components/UserEditModal'
import UserManagementFilters from '../components/UserManagementFilters'
import UserManagementTable from '../components/UserManagementTable'
import UserUnlinkConfirmModal from '../components/UserUnlinkConfirmModal'
import UserMovementsModal from '../components/UserMovementsModal'
import UserSummaryCards from '../components/UserSummaryCards'
import styles from './UserManagementPage.module.css'

const EMPTY_SUMMARY = Object.freeze({
  totalUsuarios: 0,
  vinculados: 0,
  desvinculados: 0,
})

const DEFAULT_PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 350

function normalizeStatus(status) {
  return status === 'Activo' ? 'Vinculado' : status
}

function firstWord(value) {
  return String(value ?? '').trim().split(/\s+/).filter(Boolean)[0] ?? ''
}

function mapApiUser(user) {
  const nombreUsuario = user.nombreUsuario ?? ''
  const apellidoUsuario = user.apellidoUsuario ?? ''
  const nombreCompleto =
    user.nombreCompleto ?? (`${nombreUsuario} ${apellidoUsuario}`.trim() || 'Usuario sin nombre')
  const nombreListado =
    `${firstWord(nombreUsuario)} ${firstWord(apellidoUsuario)}`.trim() || nombreCompleto

  return {
    id: user.idUsuarioAutenticacionExterna ?? user.idAuth0 ?? user.idUsuario,
    idUsuario: user.idUsuario,
    idUsuarioAutenticacionExterna: user.idUsuarioAutenticacionExterna ?? user.idAuth0,
    nombreUsuario,
    apellidoUsuario,
    nombreCompleto,
    nombreListado,
    rutUsuario: user.rutUsuario ?? 'No disponible',
    correoUsuario: user.correoUsuario ?? '',
    rolUsuario: user.rolUsuario ?? 'Sin rol asignado',
    estadoUsuario: normalizeStatus(user.estadoUsuario ?? 'Vinculado'),
  }
}

function getErrorText(error) {
  if (error?.code === API_ERROR_CODES.SESSION_INVALID || error?.status === 401) {
    return 'La sesion no es valida o expiro. Vuelve a iniciar sesion para gestionar usuarios.'
  }

  if (error?.status === 403) {
    return error?.payload?.message || 'Acceso denegado. Se requiere autorizacion administrativa para gestionar usuarios.'
  }

  if (error?.code === API_ERROR_CODES.NETWORK_ERROR) {
    return 'No fue posible contactar la API. Revisa la conexion e intenta nuevamente.'
  }

  if (error?.payload?.code === 'AUTH0_CONFIGURATION_ERROR') {
    return 'La configuracion Auth0 Management del backend esta incompleta.'
  }

  if (error?.payload?.code === 'AUTH0_INSUFFICIENT_SCOPE') {
    const requiredScopes = Array.isArray(error.payload.requiredScopes)
      ? error.payload.requiredScopes.join(', ')
      : 'read:users, create:users, update:users, read:roles'

    return `La aplicacion M2M no tiene los permisos Auth0 Management requeridos: ${requiredScopes}.`
  }

  if (error?.payload?.message) {
    return error.payload.message
  }

  if (error?.status === 409) {
    return 'Ya existe un usuario con ese correo.'
  }

  return 'No fue posible completar la operacion. Intenta nuevamente.'
}

export default function UserManagementPage() {
  const { auth0User, loginWithRedirect } = useAuth()
  const adminUsersApi = useAdminUsersApi()
  const latestRequestRef = useRef(0)
  const [users, setUsers] = useState([])
  const [activeStatus, setActiveStatus] = useState('')
  const [activeRole, setActiveRole] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [actionMessage, setActionMessage] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [movementsUser, setMovementsUser] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [unlinkingUser, setUnlinkingUser] = useState(null)
  const currentAuth0UserId = auth0User?.sub ?? null

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(debounceTimer)
  }, [searchTerm])

  const loadUsers = useCallback(
    async ({ preserveMessage = false, requestedPage = page } = {}) => {
      const requestId = latestRequestRef.current + 1
      latestRequestRef.current = requestId
      setIsLoading(true)

      if (!preserveMessage) {
        setActionMessage(null)
      }

      try {
        const response = await adminUsersApi.listUsers({
          page: requestedPage,
          perPage: DEFAULT_PAGE_SIZE,
          search: debouncedSearchTerm,
          estadoUsuario: activeStatus,
          rolUsuario: activeRole,
        })

        if (requestId !== latestRequestRef.current) {
          return
        }

        setUsers(
          (response.usuarios ?? []).map((user) => {
            const mappedUser = mapApiUser(user)

            return {
              ...mappedUser,
              isCurrentUser: Boolean(
                currentAuth0UserId &&
                  mappedUser.idUsuarioAutenticacionExterna === currentAuth0UserId,
              ),
            }
          }),
        )
        setTotalUsers(response.total ?? 0)
      } catch (error) {
        if (requestId !== latestRequestRef.current) {
          return
        }

        setUsers([])
        setTotalUsers(0)
        setActionMessage({ type: 'danger', text: getErrorText(error), requiresLogin: error?.status === 401 })
      } finally {
        if (requestId === latestRequestRef.current) {
          setIsLoading(false)
        }
      }
    },
    [activeRole, activeStatus, adminUsersApi, currentAuth0UserId, debouncedSearchTerm, page],
  )

  const loadSummary = useCallback(async () => {
    try {
      const response = await adminUsersApi.getSummary()
      setSummary({
        totalUsuarios: response.totalUsuarios ?? 0,
        vinculados: response.vinculados ?? 0,
        desvinculados: response.desvinculados ?? 0,
      })
    } catch {
      setSummary(EMPTY_SUMMARY)
    }
  }, [adminUsersApi])

  useEffect(() => {
    const requestTimer = window.setTimeout(() => {
      loadUsers()
    }, 0)

    return () => window.clearTimeout(requestTimer)
  }, [loadUsers])

  useEffect(() => {
    const requestTimer = window.setTimeout(() => {
      loadSummary()
    }, 0)

    return () => window.clearTimeout(requestTimer)
  }, [loadSummary])

  const totalPages = Math.max(1, Math.ceil(totalUsers / DEFAULT_PAGE_SIZE))

  function handleStatusChange(status) {
    setActiveStatus(status)
    setPage(1)
  }

  function handleRoleChange(role) {
    setActiveRole(role)
    setPage(1)
  }

  function handleClearFilters() {
    setActiveStatus('')
    setActiveRole('')
    setSearchTerm('')
    setDebouncedSearchTerm('')
    setPage(1)
  }

  async function refreshAfterMutation(message) {
    setActionMessage(message)
    await Promise.all([loadUsers({ preserveMessage: true }), loadSummary()])
  }

  async function handleSaveUser(updatedUser) {
    setActionMessage(null)

    try {
      await adminUsersApi.updateUser(updatedUser)
      setEditingUser(null)
      await refreshAfterMutation({ type: 'success', text: 'Usuario actualizado correctamente.' })
    } catch (error) {
      setActionMessage({ type: 'danger', text: getErrorText(error), requiresLogin: error?.status === 401 })
      throw new Error(getErrorText(error), { cause: error })
    }
  }

  async function handleUnlinkUser(user) {
    try {
      await adminUsersApi.unlinkUser({
        idUsuarioAutenticacionExterna: user.idUsuarioAutenticacionExterna,
        pin: user.pin,
      })
      setUnlinkingUser(null)
      await refreshAfterMutation({ type: 'success', text: 'Usuario desvinculado correctamente.' })
    } catch (error) {
      setActionMessage({ type: 'danger', text: getErrorText(error), requiresLogin: error?.status === 401 })
    }
  }

  async function handleCreatedUser() {
    setIsCreateModalOpen(false)
    setPage(1)
    await refreshAfterMutation({ type: 'success', text: 'Usuario creado correctamente.' })
  }

  return (
    <main className={`container-fluid ${styles.page}`} aria-labelledby="user-management-title">
      <section className={styles.dashboardShell}>
        <header className={styles.hero}>
          <span className={styles.sectionLabel}>Administracion</span>
          <h1 className={styles.pageTitle} id="user-management-title">
            Gestion de usuarios
          </h1>
          <p className={styles.pageSubtitle}>Administra usuarios, roles y estado de vinculacion del sistema.</p>
        </header>

        <UserSummaryCards summary={summary} />

        <div className={styles.content}>
          {actionMessage && (
            <div className={`${styles.feedbackMessage} ${styles[`feedback${actionMessage.type}`]}`} role="status">
              <span>{actionMessage.text}</span>
              {actionMessage.requiresLogin && (
                <UserButton onClick={() => loginWithRedirect()} variant="secondary">
                  Iniciar sesion
                </UserButton>
              )}
            </div>
          )}

          <UserManagementFilters
            activeRole={activeRole}
            activeStatus={activeStatus}
            isOpen={isFiltersOpen}
            onClear={handleClearFilters}
            onCreateUser={() => setIsCreateModalOpen(true)}
            onRoleChange={handleRoleChange}
            onSearchChange={setSearchTerm}
            onStatusChange={handleStatusChange}
            onToggle={() => setIsFiltersOpen((currentValue) => !currentValue)}
            searchTerm={searchTerm}
            summary={summary}
          />

          <UserManagementTable
            currentPage={page}
            isLoading={isLoading}
            onEditUser={setEditingUser}
            onViewMovements={setMovementsUser}
            onPageChange={setPage}
            totalPages={totalPages}
            totalUsers={totalUsers}
            users={users}
          />
        </div>
      </section>

      {movementsUser && (
        <UserMovementsModal
          key={movementsUser.id}
          user={movementsUser}
          api={adminUsersApi}
          onClose={() => setMovementsUser(null)}
        />
      )}
      <UserCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleCreatedUser}
      />
      <UserEditModal
        key={editingUser?.id ?? 'user-edit-modal'}
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onSave={handleSaveUser}
        onUnlink={(user) => {
          setEditingUser(null)
          setUnlinkingUser(user)
        }}
        isCurrentUser={Boolean(editingUser?.isCurrentUser)}
        user={editingUser}
      />
      <UserUnlinkConfirmModal
        isOpen={Boolean(unlinkingUser)}
        onClose={() => setUnlinkingUser(null)}
        onConfirm={handleUnlinkUser}
        user={unlinkingUser}
      />
    </main>
  )
}
