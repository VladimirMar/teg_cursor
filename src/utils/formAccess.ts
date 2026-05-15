type SessionAcesso = {
  sigla?: string | null
  chaveSistema?: string | null
  chave_sistema?: string | null
  permissao?: string | null
}

type SessionUser = {
  acessos?: SessionAcesso[] | null
}

type StoredSession = {
  user?: SessionUser | null
}

const SESSION_STORAGE_KEY = 'tegfinanc.auth'
const editablePermissionLevels = new Set(['alteracao', 'todos'])
const deletablePermissionLevels = new Set(['exclusao', 'todos'])

const normalizeAccessKey = (value: string | null | undefined) => {
  return (value || '').trim().toLowerCase()
}

const getStoredFormPermissionKeys = (allowedPermissionLevels: ReadonlySet<string>) => {
  if (typeof window === 'undefined') {
    return new Set<string>()
  }

  try {
    const rawSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY)

    if (!rawSession) {
      return new Set<string>()
    }

    const session = JSON.parse(rawSession) as StoredSession
    const acessos = Array.isArray(session?.user?.acessos) ? session.user.acessos : []

    return new Set(
      acessos
        .filter((acesso) => allowedPermissionLevels.has(normalizeAccessKey(acesso.permissao)))
        .flatMap((acesso) => [acesso.sigla, acesso.chaveSistema, acesso.chave_sistema].map((value) => normalizeAccessKey(value)))
        .filter(Boolean),
    )
  } catch {
    return new Set<string>()
  }
}

export const getEditableFormPermissionKeys = () => {
  return getStoredFormPermissionKeys(editablePermissionLevels)
}

export const getDeletableFormPermissionKeys = () => {
  return getStoredFormPermissionKeys(deletablePermissionLevels)
}

export const hasEditableFormPermission = (formAccessKey: string) => {
  return getEditableFormPermissionKeys().has(normalizeAccessKey(formAccessKey))
}

export const hasDeletableFormPermission = (formAccessKey: string) => {
  return getDeletableFormPermissionKeys().has(normalizeAccessKey(formAccessKey))
}

export const getEditPermissionDeniedMessage = (formLabel: string) => {
  return `Usuario sem permissao de alteracao para o formulario ${formLabel}.`
}

export const getDeletePermissionDeniedMessage = (formLabel: string) => {
  return `Usuario sem permissao de exclusao para o formulario ${formLabel}.`
}