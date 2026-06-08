import { useCallback, useEffect, useRef, useState } from 'react'
import UserButton from '../components/UserButton'
import UserCreateModal from '../components/UserCreateModal'
import UserEditModal from '../components/UserEditModal'
import UserManagementFilters from '../components/UserManagementFilters'
import UserManagementTable from '../components/UserManagementTable'
import UserSummaryCards from '../components/UserSummaryCards'
import { API_ERROR_CODES } from '../../../services/api/apiClient'
import { useAuth } from '../../../hooks/useAuth'
import { useAdminUsersApi } from '../hooks/useAdminUsersApi'
import styles from './UserManagementPage.module.css'

const USER_STATUS = Object.freeze({
  LINKED: 'Vinculado',
  UNLINKED: 'Desvinculado',
})

const EMPTY_SUMMARY = Object.freeze({
  totalUsuarios: 0,
  vinculados: 0,
  desvinculados: 0,
})

const DEFAULT_PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 350

function formatUserDate(value) {
  if (!value) {
    return 'Sin acceso'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Sin acceso'
  }

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function mapApiUser(user) {
  const apiStatus = user.estadoUsuario === 'Activo' ? USER_STATUS.LINKED : user.estadoUsuario

  return {
    id: user.idUsuarioAutenticacionExterna,
    idUsuarioAutenticacionExterna: user.idUsuarioAutenticacionExterna,
    primerNombre: user.primerNombre ?? '',
    apellidoPaterno: user.apellidoPaterno ?? '',
    nombreCompleto: user.nombreCompleto ?? `${user.primerNombre ?? ''} ${user.apellidoPaterno ?? ''}`.trim(),
    rut: user.rut ?? 'No disponible',
    correo: user.correoUsuario ?? '',
    rol: user.rolUsuario ?? 'Sin rol asignado',
    estado: apiStatus ?? USER_STATUS.LINKED,
    ultimoAcceso: formatUserDate(user.ultimoAcceso),
  }
}

function getErrorText(error) {
  if (error?.code === API_ERROR_CODES.SESSION_INVALID || error?.status === 401) {
    return 'La sesión no es válida o expiró. Vuelve a iniciar sesión para gestionar usuarios.'
  }

  if (error?.status === 403) {
    return 'Acceso denegado. Solo un administrador puede gestionar usuarios.'
  }

  if (error?.status === 409) {
    return 'Ya existe un usuario con ese correo.'
  }

  if (error?.code === API_ERROR_CODES.NETWORK_ERROR) {
    return 'No fue posible contactar la API. Revisa la conexión e intenta nuevamente.'
  }

  if (error?.payload?.code === 'AUTH0_CONFIGURATION_ERROR') {
    return 'La configuración Auth0 Management del backend está incompleta. Revisa el client ID y el client secret de la aplicación M2M.'
  }

  if (error?.payload?.code === 'AUTH0_INSUFFICIENT_SCOPE') {
    const requiredScopes = Array.isArray(error.payload.requiredScopes)
      ? error.payload.requiredScopes.join(', ')
      : 'read:users, create:users, update:users, read:roles'

    return `La aplicación M2M no tiene los permisos Auth0 Management requeridos: ${requiredScopes}.`
  }

  return error?.payload?.message ?? 'No fue posible completar la operación. Intenta nuevamente.'
}

export default function UserManagementPage() {
  const { loginWithRedirect } = useAuth()
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
  const [editingUser, setEditingUser] = useState(null)

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

        setUsers((response.usuarios ?? []).map(mapApiUser))
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
    [activeRole, activeStatus, adminUsersApi, debouncedSearchTerm, page],
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

  async function handleSaveUser(updatedUser) {
    setActionMessage(null)

    try {
      await adminUsersApi.updateUser({
        idUsuarioAutenticacionExterna: updatedUser.idUsuarioAutenticacionExterna,
        primerNombre: updatedUser.primerNombre,
        apellidoPaterno: updatedUser.apellidoPaterno,
        correoUsuario: updatedUser.correo,
        rolUsuario: updatedUser.rol,
        estadoUsuario: updatedUser.estado,
      })
      setEditingUser(null)
      setActionMessage({ type: 'success', text: 'Usuario actualizado correctamente.' })
      await Promise.all([loadUsers({ preserveMessage: true }), loadSummary()])
    } catch (error) {
      setActionMessage({ type: 'danger', text: getErrorText(error), requiresLogin: error?.status === 401 })
    }
  }

  async function handleCreatedUser() {
    setIsCreateModalOpen(false)
    setActionMessage({ type: 'success', text: 'Usuario creado correctamente.' })
    setPage(1)
    await Promise.all([loadUsers({ preserveMessage: true, requestedPage: 1 }), loadSummary()])
  }

  return (
    <main className={`container-fluid ${styles.page}`} aria-labelledby="user-management-title">
      <section className={styles.dashboardShell}>
        <header className={styles.hero}>
          <span className={styles.sectionLabel}>Administración</span>
          <h1 className={styles.pageTitle} id="user-management-title">
            Gestión de usuarios
          </h1>
          <p className={styles.pageSubtitle}>Administra usuarios, roles y estado de vinculación del sistema.</p>
        </header>

        <UserSummaryCards summary={summary} />

        <div className={styles.content}>
          {actionMessage && (
            <div className={`${styles.feedbackMessage} ${styles[`feedback${actionMessage.type}`]}`} role="status">
              <span>{actionMessage.text}</span>
              {actionMessage.requiresLogin && (
                <UserButton onClick={() => loginWithRedirect()} variant="secondary">
                  Iniciar sesión
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
            onPageChange={setPage}
            totalPages={totalPages}
            users={users}
          />
        </div>
      </section>

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
        user={editingUser}
      />
    </main>
  )
}
