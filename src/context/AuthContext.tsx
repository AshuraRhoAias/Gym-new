import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Role } from '../lib/permissions'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  username: string | null
  role: Role | null
  signIn: (username: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Los usuarios inician sesión con un "usuario" corto; internamente Supabase Auth
// requiere un correo, así que lo derivamos con un dominio fijo interno.
const EMAIL_DOMAIN = 'gymtech.local'
export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setRole(null)
      return
    }
    let active = true
    supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (active) setRole((data?.role as Role) ?? null)
      })
    return () => {
      active = false
    }
  }, [session])

  const signIn = async (username: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    })
    return { error: error ? 'Usuario o contraseña incorrectos' : null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const username =
    session?.user.email?.replace(`@${EMAIL_DOMAIN}`, '') ?? null

  return (
    <AuthContext.Provider value={{ session, loading, username, role, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
