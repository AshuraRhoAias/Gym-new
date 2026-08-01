import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface PrivacyContextValue {
  hideSinFolio: boolean
  toggleHideSinFolio: () => void
}

const PrivacyContext = createContext<PrivacyContextValue | undefined>(undefined)

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hideSinFolio, setHideSinFolio] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Digit5' && (e.getModifierState('AltGraph') || (e.ctrlKey && e.altKey))) {
        e.preventDefault()
        setHideSinFolio((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <PrivacyContext.Provider value={{ hideSinFolio, toggleHideSinFolio: () => setHideSinFolio((v) => !v) }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext)
  if (!ctx) throw new Error('usePrivacy debe usarse dentro de PrivacyProvider')
  return ctx
}

/** Un registro "sin folio" es aquel cuyo folio es nulo, vacío o '0'. */
export function tieneFolio(folio: string | null | undefined) {
  return Boolean(folio && folio !== '0')
}
