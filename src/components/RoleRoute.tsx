import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isRouteAllowed } from '../lib/permissions'

export default function RoleRoute({ children }: { children: ReactNode }) {
  const { role, session } = useAuth()
  const location = useLocation()

  if (session && role === null) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-gray-400 text-sm">
        Cargando permisos…
      </div>
    )
  }

  if (!isRouteAllowed(role, location.pathname)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
