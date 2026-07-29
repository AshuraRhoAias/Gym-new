import { createContext, useContext, useState, type ReactNode } from 'react'
import { MESES } from '../types/database'

interface PeriodContextValue {
  mes: string
  anio: number
  setMes: (mes: string) => void
  setAnio: (anio: number) => void
}

const PeriodContext = createContext<PeriodContextValue | undefined>(undefined)

export function PeriodProvider({ children }: { children: ReactNode }) {
  const now = new Date()
  const [mes, setMes] = useState(MESES[now.getMonth()])
  const [anio, setAnio] = useState(now.getFullYear())

  return (
    <PeriodContext.Provider value={{ mes, anio, setMes, setAnio }}>
      {children}
    </PeriodContext.Provider>
  )
}

export function usePeriod() {
  const ctx = useContext(PeriodContext)
  if (!ctx) throw new Error('usePeriod debe usarse dentro de PeriodProvider')
  return ctx
}
