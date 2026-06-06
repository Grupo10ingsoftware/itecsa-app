import { useCallback, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { API_ERROR_CODES } from '../../../services/api/apiClient'
import { formatRut, hasValidationErrors, validateUserCreateForm } from '../utils/userValidation'
import { useAdminUsersApi } from './useAdminUsersApi'

export const USER_CREATE_INITIAL_VALUES = Object.freeze({
  primerNombre: '',
  apellidoPaterno: '',
  correoUsuario: '',
  rutUsuario: '',
  rolUsuario: '',
})

const INITIAL_ERRORS = Object.freeze({
  primerNombre: [],
  apellidoPaterno: [],
  correoUsuario: [],
  rutUsuario: [],
  rolUsuario: [],
})

const MESSAGE_TYPES = Object.freeze({
  SUCCESS: 'success',
  WARNING: 'warning',
  DANGER: 'danger',
})

function getErrorMessage(error) {
  if (error?.code === API_ERROR_CODES.SESSION_INVALID || error?.status === 401) {
    return {
      type: MESSAGE_TYPES.WARNING,
      text: 'La sesión no es válida o expiró. Vuelve a iniciar sesión para crear usuarios.',
      requiresLogin: true,
    }
  }

  if (error?.status === 403) {
    return {
      type: MESSAGE_TYPES.DANGER,
      text: 'Acceso denegado. Tu usuario no tiene permisos para crear usuarios.',
    }
  }

  if (error?.status === 409) {
    return {
      type: MESSAGE_TYPES.WARNING,
      text: 'Ya existe un usuario con ese correo.',
    }
  }

  if (error?.code === API_ERROR_CODES.NETWORK_ERROR) {
    return {
      type: MESSAGE_TYPES.DANGER,
      text: 'No fue posible contactar la API. Revisa la conexión e intenta nuevamente.',
    }
  }

  return {
    type: MESSAGE_TYPES.DANGER,
    text: error?.payload?.message ?? 'No fue posible crear el usuario. Intenta nuevamente.',
  }
}

function buildCreatedUserMessage(user) {
  if (user.passwordSetupEmailRequested) {
    return {
      type: MESSAGE_TYPES.SUCCESS,
      text: 'Usuario creado correctamente. Auth0 solicitó el correo para establecer la contraseña.',
    }
  }

  if (user.roleAssignmentCompleted === false) {
    return {
      type: MESSAGE_TYPES.WARNING,
      text: 'La cuenta fue creada, pero no se pudo asignar el rol de acceso.',
    }
  }

  return {
    type: MESSAGE_TYPES.WARNING,
    text: 'La cuenta fue creada, pero no se pudo solicitar el correo de establecimiento de contraseña.',
  }
}

export function useUserCreateForm({ onCreated } = {}) {
  const { loginWithRedirect } = useAuth()
  const adminUsersApi = useAdminUsersApi()
  const [values, setValues] = useState(USER_CREATE_INITIAL_VALUES)
  const [fieldErrors, setFieldErrors] = useState(INITIAL_ERRORS)
  const [message, setMessage] = useState(null)
  const [createdUser, setCreatedUser] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRequestingPasswordEmail, setIsRequestingPasswordEmail] = useState(false)

  function clearResultState() {
    setMessage(null)
    setCreatedUser(null)
  }

  const resetForm = useCallback(() => {
    setValues(USER_CREATE_INITIAL_VALUES)
    setFieldErrors(INITIAL_ERRORS)
    setMessage(null)
    setCreatedUser(null)
  }, [])

  function handleFieldChange(event) {
    const { name, value } = event.target
    const nextValue = name === 'rutUsuario' ? formatRut(value) : value

    setValues((currentValues) => ({
      ...currentValues,
      [name]: nextValue,
    }))
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [name]: [],
    }))
    clearResultState()
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const nextErrors = validateUserCreateForm(values)
    setFieldErrors(nextErrors)
    clearResultState()

    if (hasValidationErrors(nextErrors)) {
      return
    }

    const payload = {
      primerNombre: values.primerNombre.trim(),
      apellidoPaterno: values.apellidoPaterno.trim(),
      correoUsuario: values.correoUsuario.trim().toLowerCase(),
      rutUsuario: formatRut(values.rutUsuario),
      rolUsuario: values.rolUsuario,
    }

    setIsSubmitting(true)

    try {
      const user = await adminUsersApi.createUser(payload)
      setCreatedUser(user)
      setMessage(buildCreatedUserMessage(user))
      setValues(USER_CREATE_INITIAL_VALUES)
      setFieldErrors(INITIAL_ERRORS)
      await onCreated?.(user)
    } catch (error) {
      setMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePasswordSetupEmailRequest() {
    if (!createdUser?.correoUsuario || createdUser.roleAssignmentCompleted === false) {
      return
    }

    setIsRequestingPasswordEmail(true)

    try {
      const response = await adminUsersApi.requestPasswordSetupEmail({
        correoUsuario: createdUser.correoUsuario,
      })
      setCreatedUser((currentUser) => ({
        ...currentUser,
        passwordSetupEmailRequested: response.passwordSetupEmailRequested,
      }))
      setMessage({
        type: MESSAGE_TYPES.SUCCESS,
        text: 'Correo de establecimiento de contraseña solicitado correctamente.',
      })
    } catch (error) {
      const nextMessage = getErrorMessage(error)
      const shouldKeepMappedMessage =
        error?.code === API_ERROR_CODES.SESSION_INVALID ||
        error?.status === 401 ||
        error?.status === 403

      setMessage({
        ...nextMessage,
        text: shouldKeepMappedMessage
          ? nextMessage.text
          : 'No fue posible solicitar el correo de establecimiento de contraseña.',
      })
    } finally {
      setIsRequestingPasswordEmail(false)
    }
  }

  return {
    canRequestPasswordSetupEmail:
      createdUser?.passwordSetupEmailRequested === false &&
      createdUser?.roleAssignmentCompleted !== false,
    createdUser,
    fieldErrors,
    handleFieldChange,
    handlePasswordSetupEmailRequest,
    handleSubmit,
    isRequestingPasswordEmail,
    isSessionInvalid: message?.requiresLogin === true,
    isSubmitting,
    loginWithRedirect,
    message,
    resetForm,
    values,
  }
}
