export type Role = 'superadmin' | 'admin' | 'editor' | 'viewer'

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: 'Superadministrador',
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador',
}

export const CREATABLE_ROLES: Role[] = ['admin', 'editor', 'viewer']

/** Solo el superadministrador puede borrar registros y crear cuentas. */
export const canDelete = (role: Role | null) => role === 'superadmin'
export const canManageUsers = (role: Role | null) => role === 'superadmin'
export const canViewAudit = (role: Role | null) => role === 'superadmin'

/** Ve montos, formas de pago y saldos. Editor y viewer nunca los ven. */
export const canSeeMoney = (role: Role | null) => role === 'superadmin' || role === 'admin'

/** Puede crear/editar inscripciones, renovaciones, etc. (viewer es solo lectura). */
export const canWriteRegistros = (role: Role | null) => role === 'superadmin' || role === 'admin' || role === 'editor'

/**
 * Rutas visibles/permitidas por rol. Dashboard y "/" siempre están
 * permitidas para cualquier cuenta con sesión.
 */
const EDITOR_ROUTES = ['/', '/inscripciones', '/renovaciones', '/scanner', '/reportes', '/completos', '/faltan']
const VIEWER_ROUTES = ['/', '/enum']
const MONEY_ROUTES = ['/registros-visitas', '/caja-visitas', '/payment-monitor', '/dia', '/enum', '/nomina']
const ADMIN_ONLY_ROUTES = ['/usuarios', '/auditoria']

export function isRouteAllowed(role: Role | null, path: string): boolean {
  if (!role) return false
  if (role === 'superadmin') return true
  if (ADMIN_ONLY_ROUTES.includes(path)) return false
  if (role === 'admin') return true
  if (role === 'editor') return EDITOR_ROUTES.includes(path)
  if (role === 'viewer') return VIEWER_ROUTES.includes(path)
  return false
}

export function isMoneyRoute(path: string): boolean {
  return MONEY_ROUTES.includes(path)
}
