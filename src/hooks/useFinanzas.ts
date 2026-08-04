import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type {
  AlcaldiaTicket,
  GastoOperativo,
  MercadoPagoCobro,
  NominaMensual,
  PagoAlcaldia,
  Trabajador,
} from '../types/database'

export interface IngresoPeriodo {
  mes: string
  anio: number
  tarjeta: number
  transferencia: number
}

/**
 * Carga todo el histórico del módulo financiero (tablas pequeñas de un solo
 * negocio) para poder agregar por periodo en el cliente sin N+1 queries por
 * mes. Los ingresos se agregan aparte desde registros_view.
 */
export function useFinanzas() {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [nominaMensual, setNominaMensual] = useState<NominaMensual[]>([])
  const [pagosAlcaldia, setPagosAlcaldia] = useState<PagoAlcaldia[]>([])
  const [alcaldiaTickets, setAlcaldiaTickets] = useState<AlcaldiaTicket[]>([])
  const [gastosOperativos, setGastosOperativos] = useState<GastoOperativo[]>([])
  const [mercadoPagoCobros, setMercadoPagoCobros] = useState<MercadoPagoCobro[]>([])
  const [ingresosPorPeriodo, setIngresosPorPeriodo] = useState<Map<string, IngresoPeriodo>>(new Map())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [trab, nom, alc, tick, gastos, mp, regs] = await Promise.all([
      supabase.from('trabajadores').select('*').order('nombre'),
      supabase.from('nomina_mensual').select('*'),
      supabase.from('pagos_alcaldia').select('*'),
      supabase.from('alcaldia_tickets').select('*'),
      supabase.from('gastos_operativos').select('*'),
      supabase.from('mercadopago_cobros').select('*'),
      supabase
        .from('registros_view')
        .select('mes, anio, forma_pago, monto')
        .in('forma_pago', ['tarjeta', 'transferencia']),
    ])

    setTrabajadores(trab.data ?? [])
    setNominaMensual(nom.data ?? [])
    setPagosAlcaldia(alc.data ?? [])
    setAlcaldiaTickets(tick.data ?? [])
    setGastosOperativos(gastos.data ?? [])
    setMercadoPagoCobros(mp.data ?? [])

    const ingresos = new Map<string, IngresoPeriodo>()
    for (const r of regs.data ?? []) {
      const key = `${r.mes}-${r.anio}`
      const entry = ingresos.get(key) ?? { mes: r.mes, anio: r.anio, tarjeta: 0, transferencia: 0 }
      if (r.forma_pago === 'tarjeta') entry.tarjeta += r.monto ?? 0
      if (r.forma_pago === 'transferencia') entry.transferencia += r.monto ?? 0
      ingresos.set(key, entry)
    }
    setIngresosPorPeriodo(ingresos)

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return {
    trabajadores,
    nominaMensual,
    pagosAlcaldia,
    alcaldiaTickets,
    gastosOperativos,
    mercadoPagoCobros,
    ingresosPorPeriodo,
    loading,
    refresh: load,
  }
}

export function periodoKey(mes: string, anio: number) {
  return `${mes}-${anio}`
}
