import type { ReactNode } from 'react'
import { Redirect, useLocation } from 'wouter'
import { useAuth } from '../context/AuthContext'
import { isRouteAllowed } from '../lib/permissions'

export default function RoleRoute({ children }: { children: ReactNode }) {
  const { role, session } = useAuth()
  const [pathname] = useLocation()

  if (session && role === null) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-gray-400 text-sm">
        Cargando permisos…
      </div>
    )
  }

  if (!isRouteAllowed(role, pathname)) {
    return <Redirect to="/" replace />
  }

  return <>{children}</>
}
