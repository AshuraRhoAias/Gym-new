export type Role = 'superadmin' | 'admin' | 'editor' | 'viewer'

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: 'Superadministrador',
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador',
}

export const CREATABLE_ROLES: Role[] = ['admin', 'editor', 'viewer']

/** Solo el superadministrador puede borrar registros, crear cuentas y ver Usuarios. */
export const canDelete = (role: Role | null) => role === 'superadmin'
export const canManageUsers = (role: Role | null) => role === 'superadmin'
/** Nómina, Finanzas y Auditoría: solo admin y superadmin. */
export const canViewAudit = (role: Role | null) => role === 'superadmin' || role === 'admin'

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
const MONEY_ROUTES = ['/registros-visitas', '/caja-visitas', '/payment-monitor', '/dia', '/enum', '/nomina', '/whats']
/** Solo superadmin: gestión de cuentas. Nómina, Finanzas y Auditoría quedan
 * fuera de EDITOR_ROUTES/VIEWER_ROUTES, así que admin+superadmin las ven. */
const SUPERADMIN_ONLY_ROUTES = ['/usuarios']

export function isRouteAllowed(role: Role | null, path: string): boolean {
  if (!role) return false
  if (role === 'superadmin') return true
  if (SUPERADMIN_ONLY_ROUTES.includes(path)) return false
  if (role === 'admin') return true
  if (role === 'editor') return EDITOR_ROUTES.includes(path)
  if (role === 'viewer') return VIEWER_ROUTES.includes(path)
  return false
}

export function isMoneyRoute(path: string): boolean {
  return MONEY_ROUTES.includes(path)
}
