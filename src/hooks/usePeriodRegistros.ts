import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Registro } from '../types/database'

/**
 * Trae todos los registros (cualquier kind) de un mes/año dado.
 * Cuando `hideSinFolio` está activo, los registros sin folio se excluyen
 * directamente en la consulta: nunca llegan al cliente.
 */
export function usePeriodRegistros(mes: string, anio: number, hideSinFolio = false) {
  const [data, setData] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('registros_view')
      .select('*')
      .eq('mes', mes)
      .eq('anio', anio)
    if (hideSinFolio) query = query.not('folio', 'is', null).neq('folio', '0')
    const { data: rows, error: err } = await query.order('created_at', { ascending: false })

    if (err) setError(err.message)
    else {
      setData(rows ?? [])
      setError(null)
    }
    setLoading(false)
  }, [mes, anio, hideSinFolio])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
