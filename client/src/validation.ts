export const NAME_MAX = 80
export const TITLE_MAX = 120
export const DESCRIPTION_MAX = 2000
export const EMAIL_MAX = 160
export const KEY_MAX = 6
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const KEY_RE = /^[A-Z][A-Z0-9]{1,5}$/

export type FieldErrors = Record<string, string | undefined>

export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean)
}

export function validateWorkspaceName(name: string): string | undefined {
  const trimmed = name.trim()
  if (!trimmed) return 'El nombre es obligatorio'
  if (trimmed.length > NAME_MAX) return `Máximo ${NAME_MAX} caracteres`
  return undefined
}

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim()
  if (!trimmed) return 'El email es obligatorio'
  if (trimmed.length > EMAIL_MAX) return `Máximo ${EMAIL_MAX} caracteres`
  if (!EMAIL_RE.test(trimmed)) return 'Email inválido'
  return undefined
}

export function validateProjectKey(key: string): string | undefined {
  const trimmed = key.trim().toUpperCase()
  if (!trimmed) return undefined
  if (!KEY_RE.test(trimmed)) return 'Clave de 2-6 letras o dígitos, empezando por letra'
  return undefined
}

export function validateTitle(title: string): string | undefined {
  const trimmed = title.trim()
  if (!trimmed) return 'El título es obligatorio'
  if (trimmed.length > TITLE_MAX) return `Máximo ${TITLE_MAX} caracteres`
  return undefined
}

export function validateDescription(description: string): string | undefined {
  if (description.length > DESCRIPTION_MAX) return `Máximo ${DESCRIPTION_MAX} caracteres`
  return undefined
}
