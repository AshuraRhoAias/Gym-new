import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Dumbbell, EyeOff, User, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePrivacy } from '../context/PrivacyContext'
import { isRouteAllowed, ROLE_LABEL } from '../lib/permissions'

const LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/inscripciones', label: 'Inscripciones' },
  { to: '/renovaciones', label: 'Renovaciones' },
  { to: '/registros-visitas', label: 'Registros Visitas' },
  { to: '/caja-visitas', label: 'Caja Visitas' },
  { to: '/scanner', label: 'Scanner' },
  { to: '/reportes', label: 'Reportes' },
  { to: '/payment-monitor', label: 'PaymentMonitor' },
  { to: '/enum', label: 'Enum' },
  { to: '/dia', label: '$ Día' },
  { to: '/completos', label: 'Completos' },
  { to: '/faltan', label: 'Faltan' },
  { to: '/nomina', label: 'Nómina' },
  { to: '/usuarios', label: 'Usuarios' },
  { to: '/auditoria', label: 'Auditoría' },
]

export default function Navbar() {
  const { username, role, signOut } = useAuth()
  const { hideSinFolio } = usePrivacy()
  const [open, setOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)

  const links = useMemo(() => LINKS.filter((link) => isRouteAllowed(role, link.to)), [role])

  return (
    <header className="sticky top-0 z-40 bg-bg border-b border-accent/40">
      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-2 shrink-0">
          <Dumbbell className="text-accent" size={22} />
          <span className="font-semibold text-white tracking-tight">GymTech</span>
        </div>

        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `px-2.5 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-accent bg-accent/10'
                    : 'text-gray-300 hover:text-white hover:bg-surface'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {hideSinFolio && (
            <span
              title="Modo privacidad activo (AltGr+5): oculta datos de registros sin folio"
              className="hidden sm:flex items-center gap-1 bg-warning/15 text-amber-300 border border-warning/30 rounded-md px-2 py-1 text-xs"
            >
              <EyeOff size={12} /> Privacidad
            </span>
          )}
          <div className="relative">
            <button
              onClick={() => setUserMenu((v) => !v)}
              className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-gray-200 hover:border-accent/50"
            >
              <User size={14} />
              {username ?? 'Usuario'}
              {role && <span className="hidden sm:inline text-xs text-gray-500">· {ROLE_LABEL[role]}</span>}
            </button>
            {userMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
                {role && (
                  <div className="px-3 py-2 text-xs text-gray-500 border-b border-border">{ROLE_LABEL[role]}</div>
                )}
                <button
                  onClick={() => {
                    setUserMenu(false)
                    signOut()
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-surface-2"
                >
                  <LogOut size={14} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
          <button
            className="lg:hidden text-gray-300"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden flex flex-col border-t border-border px-2 py-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2.5 rounded-md text-sm ${
                  isActive ? 'text-accent bg-accent/10' : 'text-gray-300'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
