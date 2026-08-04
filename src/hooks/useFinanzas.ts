import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type {
  AlcaldiaTicket,
  ConvenioPago,
  GastoOperativo,
  NominaMensual,
  PagoAlcaldia,
  Trabajador,
} from '../types/database'

export interface IngresoPeriodo {
  mes: string
  anio: number
  tarjeta: number
  transferencia: number
  /** Suma de registros.comision_tarjeta del periodo (inscripciones/renovaciones pagadas con tarjeta). */
  comisionTarjeta: number
}

/**
 * Carga todo el histórico del módulo financiero (tablas pequeñas de un solo
 * negocio) para poder agregar por periodo en el cliente sin N+1 queries por
 * mes. Los ingresos y la comisión de tarjeta se agregan aparte desde
 * registros_view (los cobra Inscripciones/Renovaciones, no este módulo).
 */
export function useFinanzas() {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [nominaMensual, setNominaMensual] = useState<NominaMensual[]>([])
  const [pagosAlcaldia, setPagosAlcaldia] = useState<PagoAlcaldia[]>([])
  const [alcaldiaTickets, setAlcaldiaTickets] = useState<AlcaldiaTicket[]>([])
  const [convenioPagos, setConvenioPagos] = useState<ConvenioPago[]>([])
  const [gastosOperativos, setGastosOperativos] = useState<GastoOperativo[]>([])
  const [ingresosPorPeriodo, setIngresosPorPeriodo] = useState<Map<string, IngresoPeriodo>>(new Map())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [trab, nom, alc, tick, conv, gastos, regs] = await Promise.all([
      supabase.from('trabajadores').select('*').order('nombre'),
      supabase.from('nomina_mensual').select('*'),
      supabase.from('pagos_alcaldia').select('*'),
      supabase.from('alcaldia_tickets').select('*'),
      supabase.from('convenio_pagos').select('*'),
      supabase.from('gastos_operativos').select('*'),
      supabase
        .from('registros_view')
        .select('mes, anio, forma_pago, monto, comision_tarjeta')
        .in('forma_pago', ['tarjeta', 'transferencia']),
    ])

    setTrabajadores(trab.data ?? [])
    setNominaMensual(nom.data ?? [])
    setPagosAlcaldia(alc.data ?? [])
    setAlcaldiaTickets(tick.data ?? [])
    setConvenioPagos(conv.data ?? [])
    setGastosOperativos(gastos.data ?? [])

    const ingresos = new Map<string, IngresoPeriodo>()
    for (const r of regs.data ?? []) {
      const key = `${r.mes}-${r.anio}`
      const entry = ingresos.get(key) ?? { mes: r.mes, anio: r.anio, tarjeta: 0, transferencia: 0, comisionTarjeta: 0 }
      if (r.forma_pago === 'tarjeta') entry.tarjeta += r.monto ?? 0
      if (r.forma_pago === 'transferencia') entry.transferencia += r.monto ?? 0
      entry.comisionTarjeta += r.comision_tarjeta ?? 0
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
    convenioPagos,
    gastosOperativos,
    ingresosPorPeriodo,
    loading,
    refresh: load,
  }
}

export function periodoKey(mes: string, anio: number) {
  return `${mes}-${anio}`
}
