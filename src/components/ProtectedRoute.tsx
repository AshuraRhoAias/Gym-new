import type { ReactNode } from 'react'
import { Redirect } from 'wouter'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-gray-400 text-sm">
        Cargando…
      </div>
    )
  }

  if (!session) return <Redirect to="/login" replace />

  return <>{children}</>
}
