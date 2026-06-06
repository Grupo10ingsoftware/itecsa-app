import { useCallback, useEffect, useMemo, useState } from 'react'
import UserButton from '../components/UserButton'
import UserCreateModal from '../components/UserCreateModal'
import UserEditModal from '../components/UserEditModal'
import UserManagementTable from '../components/UserManagementTable'
import { API_ERROR_CODES } from '../../../services/api/apiClient'
import { useAuth } from '../../../hooks/useAuth'
import { useAdminUsersApi } from '../hooks/useAdminUsersApi'
import styles from './UserManagementPage.module.css'

const USER_STATUS = Object.freeze({
  ACTIVE: 'Activo',
  UNLINKED: 'Desvinculado',
})

const USER_FILTERS = Object.freeze({
  ALL: 'Todos',
  ACTIVE: USER_STATUS.ACTIVE,
  UNLINKED: USER_STATUS.UNLINKED,
})

const FILTER_OPTIONS = Object.freeze([
  USER_FILTERS.ALL,
  USER_FILTERS.ACTIVE,
  USER_FILTERS.UNLINKED,
])

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
  return {
    id: user.idUsuarioAutenticacionExterna,
    idUsuarioAutenticacionExterna: user.idUsuarioAutenticacionExterna,
    primerNombre: user.primerNombre ?? '',
    apellidoPaterno: user.apellidoPaterno ?? '',
    nombreCompleto: user.nombreCompleto ?? `${user.primerNombre ?? ''} ${user.apellidoPaterno ?? ''}`.trim(),
    rut: user.rut ?? 'No disponible',
    correo: user.correoUsuario ?? '',
    rol: user.rolUsuario ?? 'Sin rol asignado',
    estado: user.estadoUsuario ?? USER_STATUS.ACTIVE,
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
  const [users, setUsers] = useState([])
  const [activeFilter, setActiveFilter] = useState(USER_FILTERS.ALL)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
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

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setActionMessage(null)

    try {
      const response = await adminUsersApi.listUsers({
        page,
        perPage: DEFAULT_PAGE_SIZE,
        search: debouncedSearchTerm,
        estadoUsuario: activeFilter === USER_FILTERS.ALL ? '' : activeFilter,
      })

      setUsers((response.usuarios ?? []).map(mapApiUser))
      setTotalUsers(response.total ?? 0)
    } catch (error) {
      setUsers([])
      setTotalUsers(0)
      setActionMessage({ type: 'danger', text: getErrorText(error), requiresLogin: error?.status === 401 })
    } finally {
      setIsLoading(false)
    }
  }, [activeFilter, adminUsersApi, debouncedSearchTerm, page])

  useEffect(() => {
    const requestTimer = window.setTimeout(() => {
      loadUsers()
    }, 0)

    return () => window.clearTimeout(requestTimer)
  }, [loadUsers])

  const totalPages = Math.max(1, Math.ceil(totalUsers / DEFAULT_PAGE_SIZE))

  const filterCounts = useMemo(
    () => ({
      [USER_FILTERS.ALL]: totalUsers,
      [USER_FILTERS.ACTIVE]: activeFilter === USER_FILTERS.ACTIVE ? totalUsers : '—',
      [USER_FILTERS.UNLINKED]: activeFilter === USER_FILTERS.UNLINKED ? totalUsers : '—',
    }),
    [activeFilter, totalUsers],
  )

  function handleFilterChange(filter) {
    setActiveFilter(filter)
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
      await loadUsers()
    } catch (error) {
      setActionMessage({ type: 'danger', text: getErrorText(error), requiresLogin: error?.status === 401 })
    }
  }

  async function handleCreatedUser() {
    setIsCreateModalOpen(false)
    setActionMessage({ type: 'success', text: 'Usuario creado correctamente.' })
    setPage(1)
    await loadUsers()
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

          <div className={styles.toolbar}>
            <div className={styles.quickFilters} aria-label="Filtros rápidos de usuarios" role="group">
              {FILTER_OPTIONS.map((filter) => (
                <button
                  aria-pressed={activeFilter === filter}
                  className={`${styles.filterChip} ${activeFilter === filter ? styles.filterChipActive : ''}`}
                  key={filter}
                  onClick={() => handleFilterChange(filter)}
                  type="button"
                >
                  <span>{filter}</span>
                  <strong>{filterCounts[filter]}</strong>
                </button>
              ))}
            </div>

            <div className={styles.toolbarActions}>
              <label className={styles.searchBox} htmlFor="user-management-search">
                <i className="bi bi-search" aria-hidden="true" />
                <span className="visually-hidden">Buscar usuario</span>
                <input
                  id="user-management-search"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nombre, correo o RUT"
                  type="search"
                  value={searchTerm}
                />
              </label>
              <UserButton icon="bi-plus-lg" onClick={() => setIsCreateModalOpen(true)} variant="primary">
                Crear usuario
              </UserButton>
            </div>
          </div>

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

      <UserCreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onCreated={handleCreatedUser} />
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
